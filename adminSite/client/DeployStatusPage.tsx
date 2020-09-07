import * as React from "react"
import { observer } from "mobx-react"
import { observable, runInAction } from "mobx"

import { AdminLayout } from "./AdminLayout"
import { AdminAppContext, AdminAppContextType } from "./AdminAppContext"
import { Deploy } from "deploy/types"

@observer
export class DeployStatusPage extends React.Component {
    static contextType = AdminAppContext
    context!: AdminAppContextType

    @observable deploys: Deploy[] = []

    render() {
        return (
            <AdminLayout title="Deploys">
                <main className="DeploysPage">
                    <h1>Deploy status</h1>
                    <table className="DeploysTable">
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Note</th>
                                <th>Author</th>
                            </tr>
                        </thead>
                        <tbody>
                            {this.deploys.map(deploy =>
                                deploy.changes.map((change, i) => (
                                    <tr key={`${deploy.status}-${i}`}>
                                        <td
                                            className={`cell-status cell-status--${deploy.status}`}
                                        >
                                            {deploy.status}
                                        </td>
                                        <td className="cell-message">
                                            {change.message}
                                        </td>
                                        <td className="cell-author">
                                            {change.authorName}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <p>
                        Past deploys can be found in the{" "}
                        <a
                            href="https://github.com/owid/owid-static/commits/master"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <strong>owid-static</strong> GitHub repository
                        </a>
                        .
                    </p>
                </main>
            </AdminLayout>
        )
    }

    async getData() {
        const { admin } = this.context
        if (admin.currentRequests.length > 0) return

        const json = (await admin.getJSON("/api/deploys.json")) as {
            deploys: Deploy[]
        }
        runInAction(() => {
            this.deploys = json.deploys
        })
    }

    componentDidMount() {
        this.getData()
    }
}
