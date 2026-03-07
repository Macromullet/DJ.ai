# Azure Developer CLI (azd)

## The Concept

The **Azure Developer CLI (`azd`)** is a developer-focused tool that simplifies the full lifecycle of Azure applications: provisioning infrastructure, deploying code, and managing environments. While the Azure CLI (`az`) operates on individual resources, `azd` operates on **entire applications** — understanding that your app needs compute, storage, networking, and monitoring working together.

### Core Commands

| Command | Purpose |
|---------|---------|
| `azd init` | Initialize a project with `azure.yaml` |
| `azd up` | Provision infrastructure + deploy code (one command) |
| `azd provision` | Provision infrastructure only |
| `azd deploy` | Deploy code to existing infrastructure |
| `azd env new` | Create a new environment (dev, staging, prod) |
| `azd env set` | Set environment variables |
| `azd down` | Tear down all provisioned resources |
| `azd monitor` | Open Application Insights dashboard |

### azure.yaml

The `azure.yaml` file at your project root tells `azd` how your application is structured:

```yaml
name: djai
metadata:
  template: azd-init
services:
  oauth-proxy:
    project: ./oauth-proxy
    host: function
    language: csharp
```

## How DJ.ai Uses azd

### Project Configuration

DJ.ai's `azure.yaml` in the repository root configures the OAuth proxy as the deployable service:

```yaml
# azure.yaml — tells azd about DJ.ai's deployment targets
name: djai
services:
  oauth-proxy:
    project: ./oauth-proxy
    host: function          # Azure Functions hosting
    language: csharp        # .NET runtime
```

### Environment Management

`azd` supports multiple environments — each with its own Azure resources:

```powershell
# Create environments
azd env new dev
azd env new staging
azd env new production

# Set environment-specific config
azd env set AZURE_LOCATION eastus2

# Provision and deploy to current environment
azd up
```

### Deployment Workflow

```powershell
# First time: provision everything and deploy
azd up

# Subsequent deploys: just push code changes
azd deploy

# Tear down when done (deletes all Azure resources)
azd down
```

### Integration with Bicep

`azd` automatically finds and executes the Bicep files in `infra/`:

```
azure.yaml          → "I have a service called oauth-proxy"
infra/main.bicep    → "Here's what Azure resources it needs"
azd up              → Provisions resources + deploys code
```

## DJ.ai Connection

DJ.ai uses `azd` as the primary deployment tool for the OAuth proxy backend. The `azure.yaml` file maps the `oauth-proxy/` project to Azure Functions hosting. Running `azd up` provisions all resources defined in `infra/main.bicep` (Key Vault, Redis, App Insights) and deploys the Function App code. The `setup.ps1 --cloud` script uses `azd` environment variables to configure Key Vault secrets.

## Key Takeaways

- `azd up` = provision infrastructure + deploy code in one command
- `azure.yaml` describes your app structure; `infra/` describes its cloud resources
- Environments let you maintain separate dev/staging/prod deployments
- `azd` wraps Bicep and Azure CLI, providing a simpler developer experience

## Further Reading

- [Azure Developer CLI Overview](https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/overview)
- [azd Reference](https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/reference)
- [Make Your Project azd-compatible](https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/make-azd-compatible)
