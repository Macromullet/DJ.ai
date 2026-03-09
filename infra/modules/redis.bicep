@description('Name of the Redis cache')
param name string

@description('Location for the Redis cache')
param location string

@description('Tags to apply to the Redis cache')
param tags object

@description('Disable public network access (requires private endpoints)')
param disablePublicAccess bool = false

// NOTE: Standard C1 is needed for private endpoints and AAD auth support.
// For dev (no private endpoints), Basic C0 is cheaper but Standard is kept
// for consistency. AAD/Entra ID auth is enabled but the Azure Functions Redis
// extension doesn't yet support MI-based token auth natively.
// TODO: Switch to MI-based Redis auth when Functions Redis trigger supports it.
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
    publicNetworkAccess: disablePublicAccess ? 'Disabled' : 'Enabled'
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
