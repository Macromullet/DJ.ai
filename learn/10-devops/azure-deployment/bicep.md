# Bicep — Infrastructure as Code

## The Concept

**Bicep** is a domain-specific language (DSL) for deploying Azure resources. It compiles to ARM (Azure Resource Manager) templates but is far more readable and maintainable than raw JSON. Think of Bicep as "TypeScript for Azure infrastructure" — it adds syntax sugar, type safety, and modules on top of the underlying platform.

### Bicep vs ARM Templates

```bicep
// Bicep — clean and readable
resource vault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'djai-keyvault'
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
  }
}
```

```json
// ARM Template — verbose JSON equivalent
{
  "type": "Microsoft.KeyVault/vaults",
  "apiVersion": "2023-07-01",
  "name": "djai-keyvault",
  "location": "[parameters('location')]",
  "properties": {
    "sku": { "family": "A", "name": "standard" },
    "tenantId": "[subscription().tenantId]"
  }
}
```

### Key Bicep Features

| Feature | Description |
|---------|-------------|
| **Modules** | Reusable resource definitions in separate files |
| **Parameters** | Input values for flexibility across environments |
| **Variables** | Computed values for DRY templates |
| **Outputs** | Return values from deployments (URLs, IDs) |
| **Existing** | Reference already-deployed resources |
| **Loops** | `for` expressions for creating multiple resources |
| **Conditions** | `if` expressions for conditional deployment |

## How DJ.ai Uses Bicep

DJ.ai's `infra/` directory contains modular Bicep files:

```
infra/
├── main.bicep              → Entry point, composes all modules
├── main.parameters.json    → Environment-specific values
├── core/
│   ├── keyvault.bicep      → Key Vault for client secrets
│   ├── monitoring.bicep    → Application Insights + Log Analytics
│   └── redis.bicep         → Redis Cache for rate limiting
├── app/
│   ├── function-app.bicep  → OAuth proxy Function App
│   └── storage.bicep       → Function App storage account
└── identity/
    └── managed-id.bicep    → User-assigned managed identity
```

### Module Composition

```bicep
// main.bicep composes modules
module keyvault 'core/keyvault.bicep' = {
  name: 'keyvault'
  params: {
    location: location
    principalId: functionApp.outputs.principalId
  }
}

module functionApp 'app/function-app.bicep' = {
  name: 'function-app'
  params: {
    location: location
    keyVaultUri: keyvault.outputs.vaultUri
  }
}
```

## DJ.ai Connection

Every Azure resource DJ.ai uses is defined in Bicep — from the Key Vault storing OAuth client secrets to the Redis Cache handling rate limiting. Changes to infrastructure go through the same PR review process as application code. Running `azd up` provisions all resources defined in `infra/main.bicep`.

## Key Takeaways

- Bicep is more readable and maintainable than raw ARM templates
- Use modules to organize resources by concern (core, app, identity)
- Parameters make templates reusable across environments (dev, staging, prod)
- Version-control infrastructure alongside application code

## Further Reading

- [Bicep Overview](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/overview)
- [Bicep File Structure](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/file)
- [Bicep Playground](https://aka.ms/bicepdemo)
