import * as React from "react"
import * as ReactDOM from "react-dom"
import { action, observable, IReactionDisposer, reaction, computed } from "mobx"
import { observer } from "mobx-react"
import Select, {
    components,
    GroupedOptionsType,
    Props,
    ValueType,
} from "react-select"
import classnames from "classnames"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTimes } from "@fortawesome/free-solid-svg-icons/faTimes"
import { countries } from "../../../clientUtils/countries"
import {
    throttle,
    noop,
    getCountryCodeFromNetlifyRedirect,
    sortBy,
} from "../../../clientUtils/Util"
import { GrapherAnalytics } from "../../core/GrapherAnalytics"
import { WorldEntityName } from "../../core/GrapherConstants"
import {
    GLOBAL_ENTITY_SELECTOR_DEFAULT_COUNTRY,
    GLOBAL_ENTITY_SELECTOR_SELECTOR,
} from "./GlobalEntitySelectorConstants"
import { SelectionArray } from "../../selection/SelectionArray"
import { EntityName } from "../../../coreTable/OwidTableConstants"
import {
    setWindowQueryStr,
    queryParamsToStr,
    getWindowQueryParams,
} from "../../../clientUtils/url"
import { EntityUrlBuilder } from "../../core/EntityUrlBuilder"

enum GlobalEntitySelectionModes {
    none = "none",
    // Possibly might need the `add` state in the future to
    // add country from geolocation without clearing others.
    // One thing to figure out is what its behaviour should
    // be for single-entity charts.

    // add = "add",
    override = "override",
}

const allEntities = sortBy(countries, (c) => c.name)
    // Add 'World'
    .concat([
        {
            name: WorldEntityName,
            code: "OWID_WRL",
            slug: "world",
        },
    ])

const Option = (props: any) => {
    return (
        <div>
            <components.Option {...props}>
                <input type="checkbox" checked={props.isSelected} readOnly />{" "}
                <label>{props.label}</label>
            </components.Option>
        </div>
    )
}

const SelectOptions: Props = {
    components: {
        IndicatorSeparator: null,
        Option,
    },
    menuPlacement: "bottom",
    isClearable: false,
    isMulti: true,
    backspaceRemovesValue: false,
    blurInputOnSelect: false,
    closeMenuOnSelect: false,
    controlShouldRenderValue: false,
    hideSelectedOptions: false,
    placeholder: "Add a country to all charts...",
    styles: {
        placeholder: (base: any) => ({ ...base, whiteSpace: "nowrap" }),
        valueContainer: (base: any) => ({
            ...base,
            paddingTop: 0,
            paddingBottom: 0,
        }),
        control: (base: any) => ({ ...base, minHeight: "initial" }),
        dropdownIndicator: (base: any) => ({ ...base, padding: "0 5px" }),
    },
}

function SelectedItems(props: {
    selectedEntityNames: EntityName[]
    emptyLabel: string
    canRemove?: boolean
    onRemove?: (item: EntityName) => void
}) {
    const canRemove = (props.canRemove ?? true) && props.onRemove !== undefined
    const onRemove = props.onRemove || noop
    const isEmpty = props.selectedEntityNames.length === 0
    return (
        <div className="selected-items-container">
            {isEmpty ? (
                <div className="empty">{props.emptyLabel}</div>
            ) : (
                <div className="selected-items">
                    {props.selectedEntityNames.map((entityName) => (
                        <div
                            key={entityName}
                            className={classnames("selected-item", {
                                removable: canRemove,
                            })}
                        >
                            <div className="label">{entityName}</div>
                            {canRemove && (
                                <div
                                    className="remove-icon"
                                    onClick={() => onRemove(entityName)}
                                >
                                    <FontAwesomeIcon icon={faTimes} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

@observer
export class GlobalEntitySelector extends React.Component<{
    selection: SelectionArray
    graphersAndExplorersToUpdate?: Set<SelectionArray>
    environment?: string
}> {
    refContainer: React.RefObject<HTMLDivElement> = React.createRef()
    disposers: IReactionDisposer[] = []

    @observable mode = GlobalEntitySelectionModes.none

    @observable private isNarrow = true
    @observable private isOpen = false
    @observable private localEntityName: EntityName | undefined

    selection = this.props.selection

    @observable.ref private optionGroups: GroupedOptionsType<any> = []

    componentDidMount() {
        this.onResize()
        window.addEventListener("resize", this.onResizeThrottled)
        this.disposers.push(
            reaction(
                () => this.isOpen,
                () => this.prepareOptionGroups()
            )
        )
        this.populateLocalEntity()
        // this.updateAllGraphersAndExplorersOnPage()
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this.onResizeThrottled)
        this.disposers.forEach((dispose) => dispose())
    }

    private onResizeThrottled = throttle(this.onResize, 200)
    @action.bound private onResize() {
        const container = this.refContainer.current
        if (container) this.isNarrow = container.offsetWidth <= 640
    }

    @action.bound async populateLocalEntity() {
        try {
            const localCountryCode = await getCountryCodeFromNetlifyRedirect()
            if (!localCountryCode) return

            const country = allEntities.find(
                (entity) => entity.code === localCountryCode
            )
            if (country) this.localEntityName = country.name
        } catch (err) {}
    }

    @action.bound private prepareOptionGroups() {
        let optionGroups: GroupedOptionsType<any> = []
        // We want to include the local country, but not if it's already selected, it adds
        // unnecessary duplication.
        if (
            this.localEntityName &&
            !this.selection.selectedSet.has(this.localEntityName)
        ) {
            optionGroups = optionGroups.concat([
                {
                    label: "Suggestions",
                    options: [entityNameToOption(this.localEntityName)],
                },
            ])
        }
        if (this.selection.hasSelection) {
            optionGroups = optionGroups.concat([
                {
                    label: "Selected",
                    options: this.selection.selectedEntityNames.map(
                        entityNameToOption
                    ),
                },
            ])
        }
        optionGroups = optionGroups.concat([
            {
                label: "All countries",
                options: allEntities
                    .map((entity) => entity.name)
                    .map(entityNameToOption),
            },
        ])
        this.optionGroups = optionGroups
        return optionGroups
    }

    private analytics = new GrapherAnalytics(
        this.props.environment ?? "development"
    )

    @action.bound private onChange(options: ValueType<any>) {
        this.selection.setSelectedEntities(
            options.map((option: any) => option.label)
        )
        this.analytics.logGlobalEntitySelector(
            "change",
            this.selection.selectedEntityNames.join(",")
        )
        this.updateAllGraphersAndExplorersOnPage()

        setWindowQueryStr(
            queryParamsToStr({ selection: this.selection.asParam })
        )
    }

    @action.bound private updateAllGraphersAndExplorersOnPage() {
        if (!this.props.graphersAndExplorersToUpdate) return
        Array.from(this.props.graphersAndExplorersToUpdate.values()).forEach(
            (value) => {
                value.setSelectedEntities(this.selection.selectedEntityNames)
            }
        )
    }

    @action.bound private onRemove(option: EntityName) {
        this.selection.toggleSelection(option)
        this.updateAllGraphersAndExplorersOnPage()
    }

    @action.bound private onMenuOpen() {
        this.isOpen = true
    }

    @action.bound private onMenuClose() {
        this.isOpen = false
    }

    @action.bound private onButtonOpen(
        event: React.MouseEvent<HTMLButtonElement>
    ) {
        this.analytics.logGlobalEntitySelector(
            "open",
            event.currentTarget.innerText
        )
        this.onMenuOpen()
    }

    @action.bound private onButtonClose(
        event: React.MouseEvent<HTMLButtonElement>
    ) {
        this.analytics.logGlobalEntitySelector(
            "close",
            event.currentTarget.innerText
        )
        this.onMenuClose()
    }

    @computed private get selectedOptions() {
        return this.selection.selectedEntityNames.map(entityNameToOption)
    }

    private renderNarrow() {
        return (
            <>
                <div
                    className={classnames("narrow-summary", {
                        "narrow-summary-selected-items": !this.isOpen,
                    })}
                >
                    {this.isOpen ? (
                        <Select
                            {...SelectOptions}
                            options={this.optionGroups}
                            value={this.selectedOptions}
                            onChange={this.onChange}
                            menuIsOpen={this.isOpen}
                            autoFocus={true}
                        />
                    ) : (
                        <>
                            {!this.selection.hasSelection
                                ? "None selected"
                                : this.selection.selectedEntityNames
                                      .map((entityName) => (
                                          <span
                                              className="narrow-summary-selected-item"
                                              key={entityName}
                                          >
                                              {entityName}
                                          </span>
                                      ))
                                      .reduce(
                                          (acc, item) =>
                                              acc.length === 0
                                                  ? [item]
                                                  : [...acc, ", ", item],
                                          [] as (JSX.Element | string)[]
                                      )}
                        </>
                    )}
                </div>
                <div className="narrow-actions">
                    {this.isOpen ? (
                        <button className="button" onClick={this.onButtonClose}>
                            Done
                        </button>
                    ) : (
                        <button className="button" onClick={this.onButtonOpen}>
                            {!this.selection.hasSelection
                                ? "Select countries"
                                : "Edit"}
                        </button>
                    )}
                </div>
            </>
        )
    }

    private renderWide() {
        return (
            <>
                <div className="select-dropdown-container">
                    <Select
                        {...SelectOptions}
                        options={this.optionGroups}
                        onChange={this.onChange}
                        value={this.selectedOptions}
                        onMenuOpen={this.onMenuOpen}
                        onMenuClose={this.onMenuClose}
                    />
                </div>
                <SelectedItems
                    selectedEntityNames={this.selection.selectedEntityNames}
                    onRemove={this.onRemove}
                    emptyLabel="Select countries to show on all charts"
                />
            </>
        )
    }

    render() {
        return (
            <div
                className={classnames("global-entity-control", {
                    "is-narrow": this.isNarrow,
                    "is-wide": !this.isNarrow,
                })}
                ref={this.refContainer}
                onClick={
                    this.isNarrow && !this.isOpen ? this.onMenuOpen : undefined
                }
            >
                {this.isNarrow ? this.renderNarrow() : this.renderWide()}
            </div>
        )
    }
}

// todo: add analytics back
export const hydrateGlobalEntitySelectorIfAny = (
    selection: SelectionArray,
    graphersAndExplorersToUpdate: Set<SelectionArray>
) => {
    const element = document.querySelector(GLOBAL_ENTITY_SELECTOR_SELECTOR)
    if (!element) return

    ReactDOM.hydrate(
        <GlobalEntitySelector
            selection={selection}
            graphersAndExplorersToUpdate={graphersAndExplorersToUpdate}
        />,
        element
    )
}

const entityNameToOption = (label: EntityName) => ({
    label,
    value: label,
})
