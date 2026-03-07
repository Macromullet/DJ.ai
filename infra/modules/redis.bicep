param name string
param location string
param tags object

resource redis 'Microsoft.Cache/redis@2023-08-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'Basic'
      family: 'C'
      capacity: 0  // C0 Basic (~$15/mo)
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
  }
}

output name string = redis.name

@description('Redis connection string')
#disable-next-line outputs-should-not-contain-secrets
output connectionString string = '${redis.properties.hostName}:${redis.properties.sslPort},password=${redis.listKeys().primaryKey},ssl=True,abortConnect=False'
