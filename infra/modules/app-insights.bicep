@description('Name of the Application Insights resource')
param name string

@description('Location for the Application Insights resource')
param location string

@description('Tags to apply to the Application Insights resource')
param tags object

@description('Resource ID of the Log Analytics workspace to send telemetry to')
param logAnalyticsWorkspaceId string

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: name
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspaceId
    DisableLocalAuth: true
  }
}

// Only output ConnectionString — InstrumentationKey is deprecated and removed for security.
@description('Application Insights connection string (use instead of deprecated instrumentation key)')
output connectionString string = appInsights.properties.ConnectionString
