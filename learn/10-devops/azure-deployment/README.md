# Azure Deployment

## The Concept

Deploying to Azure involves provisioning cloud resources (compute, storage, networking) and pushing application code to them. Modern Azure deployments use **Infrastructure as Code** (IaC) to define resources declaratively and **CI/CD pipelines** to automate the deployment process.

### Azure's Deployment Stack

| Tool | Purpose |
|------|---------|
| **Bicep** | DSL for defining Azure resources (compiles to ARM templates) |
| **Azure Developer CLI (azd)** | Developer-friendly CLI for provisioning and deploying |
| **Azure CLI** | General-purpose Azure command-line tool |
| **ARM Templates** | JSON resource definitions (Bicep compiles to these) |

## DJ.ai's Azure Architecture

DJ.ai deploys the OAuth proxy backend to Azure:

```
Azure Resource Group
├── Function App (oauth-proxy)         — Serverless API
├── Key Vault                          — Client secrets storage
├── Application Insights               — Monitoring and telemetry
├── Redis Cache                        — Rate limiting and device tokens
├── Storage Account                    — Function App runtime storage
└── Managed Identity                   — Passwordless authentication
```

All resources are defined in the `infra/` directory as Bicep modules and provisioned via `azd up`.

## Learning Path

| File | Topic |
|------|-------|
| [bicep.md](./bicep.md) | Infrastructure as Code with Bicep |
| [azd.md](./azd.md) | Azure Developer CLI |
| [managed-identity-deployment.md](./managed-identity-deployment.md) | OIDC and workload identity |

## Key Takeaways

- Infrastructure as Code makes deployments reproducible and reviewable
- Managed Identity eliminates passwords for service-to-service communication
- Azure Functions (serverless) is ideal for low-traffic, event-driven workloads like OAuth
- Separate infrastructure definition (Bicep) from application deployment (CI/CD)

## Further Reading

- [Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/)
- [Azure Functions Documentation](https://learn.microsoft.com/en-us/azure/azure-functions/)
