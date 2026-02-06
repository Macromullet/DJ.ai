# DJ.ai Azure Infrastructure

## Prerequisites
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli)
- [Azure Developer CLI (azd)](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd)

## Quick Start

### First-time setup
```bash
azd auth login
azd init
azd env new dev
azd env set AZURE_LOCATION eastus2
```

### Deploy
```bash
# Deploy to dev
azd up

# Deploy to production
azd env new production
azd env set AZURE_LOCATION eastus2
azd up
```

### Add OAuth secrets to Key Vault
After deployment, add your provider secrets:
```bash
VAULT_NAME=$(azd env get-value AZURE_KEY_VAULT_NAME)
az keyvault secret set --vault-name $VAULT_NAME --name GoogleClientId --value "YOUR_CLIENT_ID"
az keyvault secret set --vault-name $VAULT_NAME --name GoogleClientSecret --value "YOUR_SECRET"
az keyvault secret set --vault-name $VAULT_NAME --name SpotifyClientId --value "YOUR_CLIENT_ID"
az keyvault secret set --vault-name $VAULT_NAME --name SpotifyClientSecret --value "YOUR_SECRET"
```

## Resources Provisioned
- Azure Functions (Premium EP1) — OAuth proxy
- Azure Cache for Redis (Basic C0) — distributed state
- Azure Key Vault — secret management
- Application Insights + Log Analytics — monitoring
- Storage Account — Functions runtime

## Cost Estimate
- ~$55/month (Premium Functions ~$35 + Redis ~$15 + misc ~$5)
