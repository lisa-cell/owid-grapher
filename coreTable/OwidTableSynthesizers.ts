import { TimeRange } from "grapher/core/GrapherConstants"
import { sampleFrom, getRandomNumberGenerator, range } from "grapher/utils/Util"
import { countries } from "utils/countries"
import { ColumnSlug, ColumnTypeNames } from "./CoreTableConstants"
import { LegacyVariableDisplayConfigInterface } from "./LegacyVariableCode"
import { OwidTable } from "./OwidTable"
import { OwidColumnSpec, OwidTableSlugs } from "./OwidTableConstants"

interface SynthOptions {
    entityCount: number
    entityNames: string[]
    timeRange: TimeRange
    columnSpecs: OwidColumnSpec[]
}

const SynthesizeOwidTable = (
    options?: Partial<SynthOptions>,
    seed = Date.now()
) => {
    const finalOptions: SynthOptions = {
        entityNames: [],
        entityCount: 2,
        timeRange: [1950, 2020],
        columnSpecs: [],
        ...options,
    }
    const { entityCount, columnSpecs, timeRange, entityNames } = finalOptions
    const colSlugs = ([
        OwidTableSlugs.entityName,
        OwidTableSlugs.entityCode,
        OwidTableSlugs.entityId,
        OwidTableSlugs.year,
    ] as ColumnSlug[]).concat(columnSpecs.map((col) => col.slug!))

    const entities = entityNames.length
        ? entityNames.map((name) => {
              return {
                  name,
                  code: name.substr(0, 3).toUpperCase(),
              }
          })
        : sampleFrom(countries, entityCount, seed)

    const rows = entities.map((entity, index) => {
        let values = columnSpecs.map((spec) => spec.generator!())
        return range(timeRange[0], timeRange[1])
            .map((year) => {
                values = columnSpecs.map((spec, index) =>
                    Math.round(
                        values[index] * (1 + spec.growthRateGenerator!() / 100)
                    )
                )
                return [entity.name, entity.code, index, year, ...values].join(
                    ","
                )
            })
            .join("\n")
    })

    return OwidTable.fromDelimited(
        `${colSlugs.join(",")}\n${rows.join("\n")}`,
        columnSpecs
    )
}

export const SynthesizeNonCountryTable = (
    options?: Partial<SynthOptions>,
    seed = Date.now()
) =>
    SynthesizeOwidTable(
        {
            entityNames: ["Fire", "Earthquake", "Tornado"],
            columnSpecs: [
                {
                    slug: SampleColumnSlugs.Disasters,
                    type: ColumnTypeNames.Integer,
                    generator: getRandomNumberGenerator(0, 20, seed),
                    growthRateGenerator: getRandomNumberGenerator(
                        -50,
                        50,
                        seed
                    ),
                },
            ],
            ...options,
        },
        seed
    )

export enum SampleColumnSlugs {
    Population = "Population",
    GDP = "GDP",
    LifeExpectancy = "LifeExpectancy",
    Fruit = "Fruit",
    Vegetables = "Vegetables",
    Disasters = "Disasters",
}

export const SynthesizeGDPTable = (
    options?: Partial<SynthOptions>,
    seed = Date.now(),
    display?: LegacyVariableDisplayConfigInterface
) =>
    SynthesizeOwidTable(
        {
            columnSpecs: [
                {
                    slug: SampleColumnSlugs.Population,
                    type: ColumnTypeNames.Population,
                    source: SynthSource(SampleColumnSlugs.Population),
                    generator: getRandomNumberGenerator(1e7, 1e9, seed),
                    growthRateGenerator: getRandomNumberGenerator(-5, 5, seed),
                    display,
                },
                {
                    slug: SampleColumnSlugs.GDP,
                    type: ColumnTypeNames.Currency,
                    source: SynthSource(SampleColumnSlugs.GDP),
                    generator: getRandomNumberGenerator(1e9, 1e12, seed),
                    growthRateGenerator: getRandomNumberGenerator(
                        -15,
                        15,
                        seed
                    ),
                    display,
                },
                {
                    slug: SampleColumnSlugs.LifeExpectancy,
                    type: ColumnTypeNames.Age,
                    source: SynthSource(SampleColumnSlugs.LifeExpectancy),
                    generator: getRandomNumberGenerator(60, 90, seed),
                    growthRateGenerator: getRandomNumberGenerator(-2, 2, seed),
                    display,
                },
            ],
            ...options,
        },
        seed
    )

const SynthSource = (name: string) => {
    return {
        id: name.charCodeAt(0) + name.charCodeAt(1) + name.charCodeAt(2),
        name: `${name} Almanac`,
        dataPublishedBy: `${name} Synthetic Data Team`,
        dataPublisherSource: `${name} Institute`,
        link: "http://foo.example",
        retrievedDate: "1/1/2000",
        additionalInfo: `Downloaded via FTP`,
    }
}

export const SynthesizeFruitTable = (
    options?: Partial<SynthOptions>,
    seed = Date.now()
) =>
    SynthesizeOwidTable(
        {
            columnSpecs: [
                {
                    slug: SampleColumnSlugs.Fruit,
                    type: ColumnTypeNames.Numeric,
                    source: SynthSource(SampleColumnSlugs.Fruit),
                    generator: getRandomNumberGenerator(500, 1000, seed),
                    growthRateGenerator: getRandomNumberGenerator(
                        -10,
                        10,
                        seed
                    ),
                },
                {
                    slug: SampleColumnSlugs.Vegetables,
                    type: ColumnTypeNames.Numeric,
                    source: SynthSource(SampleColumnSlugs.Vegetables),
                    generator: getRandomNumberGenerator(400, 1000, seed),
                    growthRateGenerator: getRandomNumberGenerator(
                        -10,
                        12,
                        seed
                    ),
                },
            ],
            ...options,
        },
        seed
    )
