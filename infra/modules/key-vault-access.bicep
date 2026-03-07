@description('Name of the Key Vault to grant access to')
param keyVaultName string

@description('Principal ID of the managed identity to grant Key Vault Secrets User role')
param principalId string

// Key Vault Secrets User — allows reading secret values (required for OAuth client secrets)
var keyVaultSecretsUserRole = '4633458b-17de-408a-b874-0445c86b69e6'

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

@description('Grants Key Vault Secrets User role to the managed identity')
resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, principalId, keyVaultSecretsUserRole)
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsUserRole)
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}
