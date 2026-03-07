@description('Name of the Log Analytics workspace')
param name string

@description('Location for the Log Analytics workspace')
param location string

@description('Tags to apply to the Log Analytics workspace')
param tags object

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

@description('Resource ID of the Log Analytics workspace')
output id string = logAnalytics.id
