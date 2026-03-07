@description('Name of the Redis cache')
param name string

@description('Location for the Redis cache')
param location string

@description('Tags to apply to the Redis cache')
param tags object

// NOTE: Upgraded from Basic C0 to Standard C1 because:
//   - Basic tier does NOT support private endpoints (required for network isolation)
//   - Basic tier does NOT support VNet integration
//   - Standard tier adds replication and SLA guarantees
// AAD/Entra ID authentication is supported on Standard tier, but the Azure Functions
// Redis extension does not yet support MI-based token authentication natively.
// TODO: Switch to MI-based Redis auth when the Functions Redis trigger supports it.
//       Track: https://github.com/Azure/azure-functions-redis-extension/issues
resource redis 'Microsoft.Cache/redis@2024-03-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'Standard'
      family: 'C'
      capacity: 1
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Disabled'
    redisConfiguration: {
      'aad-enabled': 'True'
    }
  }
}

@description('Name of the Redis cache')
output name string = redis.name

@description('Resource ID of the Redis cache')
output id string = redis.id

// Access-key connection string is still required because the Azure Functions Redis
// extension does not support Managed Identity token-based authentication.
// Traffic is secured via private endpoint — no public network exposure.
@description('Redis connection string (access-key based, over private endpoint)')
#disable-next-line outputs-should-not-contain-secrets
output connectionString string = '${redis.properties.hostName}:${redis.properties.sslPort},password=${redis.listKeys().primaryKey},ssl=True,abortConnect=False'
