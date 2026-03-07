using FluentAssertions;
using Xunit;

namespace DJai.OAuthProxy.Tests;

public class SmokeTest
{
    [Fact]
    public void ProjectBuilds_AndTestsRun()
    {
        true.Should().BeTrue();
    }
}
