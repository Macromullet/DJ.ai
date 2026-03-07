using FluentAssertions;
using DJai.OAuthProxy.Services;

namespace DJai.OAuthProxy.Tests.Services;

public class ValidationServiceTests
{
    private readonly ValidationService _service = new();

    #region IsValidRedirectUri

    [Theory]
    [InlineData("http://localhost:5173/oauth/callback")]
    [InlineData("http://localhost:5174/callback")]
    [InlineData("http://localhost:5175/auth")]
    [InlineData("http://127.0.0.1:5173/callback")]
    public void IsValidRedirectUri_LocalhostAllowedPort_ReturnsTrue(string uri)
    {
        _service.IsValidRedirectUri(uri).Should().BeTrue();
    }

    [Theory]
    [InlineData("http://localhost:3000/callback")]   // Port not in allowlist
    [InlineData("http://localhost:8080/callback")]   // Port not in allowlist
    public void IsValidRedirectUri_LocalhostDisallowedPort_ReturnsFalse(string uri)
    {
        _service.IsValidRedirectUri(uri).Should().BeFalse();
    }

    [Fact]
    public void IsValidRedirectUri_HttpNonLocalhost_ReturnsFalse()
    {
        _service.IsValidRedirectUri("http://example.com/callback").Should().BeFalse();
    }

    [Fact]
    public void IsValidRedirectUri_Empty_ReturnsFalse()
    {
        _service.IsValidRedirectUri("").Should().BeFalse();
    }

    [Fact]
    public void IsValidRedirectUri_Null_ReturnsFalse()
    {
        _service.IsValidRedirectUri(null!).Should().BeFalse();
    }

    [Fact]
    public void IsValidRedirectUri_TooLong_ReturnsFalse()
    {
        var longUri = "http://localhost:5173/" + new string('a', 2048);
        _service.IsValidRedirectUri(longUri).Should().BeFalse();
    }

    [Fact]
    public void IsValidRedirectUri_InvalidUri_ReturnsFalse()
    {
        _service.IsValidRedirectUri("not-a-valid-uri").Should().BeFalse();
    }

    [Fact]
    public void IsValidRedirectUri_CustomScheme_ReturnsTrue()
    {
        // "djai" is the default allowed custom scheme for Electron deep linking
        _service.IsValidRedirectUri("djai://oauth/callback").Should().BeTrue();
    }

    [Fact]
    public void IsValidRedirectUri_FtpScheme_ReturnsFalse()
    {
        _service.IsValidRedirectUri("ftp://localhost:5173/callback").Should().BeFalse();
    }

    #endregion

    #region IsValidOAuthCode

    [Theory]
    [InlineData("4/P7q7W91a-oMsCeLvIaQm6bTrgtp7")]       // Google-style code
    [InlineData("AQBx_Tsk...longcode_abc123DEF456")]       // Typical long code
    [InlineData("abcdef1234567890")]                        // Simple alphanumeric
    public void IsValidOAuthCode_ValidCode_ReturnsTrue(string code)
    {
        _service.IsValidOAuthCode(code).Should().BeTrue();
    }

    [Fact]
    public void IsValidOAuthCode_TooShort_ReturnsFalse()
    {
        _service.IsValidOAuthCode("short").Should().BeFalse();
    }

    [Fact]
    public void IsValidOAuthCode_Empty_ReturnsFalse()
    {
        _service.IsValidOAuthCode("").Should().BeFalse();
    }

    [Fact]
    public void IsValidOAuthCode_TooLong_ReturnsFalse()
    {
        var longCode = new string('a', 1025);
        _service.IsValidOAuthCode(longCode).Should().BeFalse();
    }

    [Fact]
    public void IsValidOAuthCode_SpecialCharsAllowed_ReturnsTrue()
    {
        // Slash, plus, equals, dash, underscore, dot
        _service.IsValidOAuthCode("4/abc+def=ghi-jkl_mno.pqr").Should().BeTrue();
    }

    [Fact]
    public void IsValidOAuthCode_DisallowedChars_ReturnsFalse()
    {
        _service.IsValidOAuthCode("code<script>alert(1)</script>").Should().BeFalse();
    }

    #endregion

    #region IsValidOAuthState

    [Theory]
    [InlineData("550e8400-e29b-41d4-a716-446655440000")]  // Standard GUID
    [InlineData("abcdefgh12345678")]                        // Simple alphanumeric
    public void IsValidOAuthState_ValidState_ReturnsTrue(string state)
    {
        _service.IsValidOAuthState(state).Should().BeTrue();
    }

    [Fact]
    public void IsValidOAuthState_TooShort_ReturnsFalse()
    {
        _service.IsValidOAuthState("short").Should().BeFalse();
    }

    [Fact]
    public void IsValidOAuthState_Empty_ReturnsFalse()
    {
        _service.IsValidOAuthState("").Should().BeFalse();
    }

    [Fact]
    public void IsValidOAuthState_TooLong_ReturnsFalse()
    {
        var longState = new string('a', 257);
        _service.IsValidOAuthState(longState).Should().BeFalse();
    }

    [Fact]
    public void IsValidOAuthState_DisallowedChars_ReturnsFalse()
    {
        _service.IsValidOAuthState("state_with_underscore!").Should().BeFalse();
    }

    #endregion

    #region IsValidDeviceToken

    [Fact]
    public void IsValidDeviceToken_ValidGuid_ReturnsTrue()
    {
        _service.IsValidDeviceToken(Guid.NewGuid().ToString()).Should().BeTrue();
    }

    [Fact]
    public void IsValidDeviceToken_NotGuid_ReturnsFalse()
    {
        _service.IsValidDeviceToken("not-a-guid-at-all").Should().BeFalse();
    }

    [Fact]
    public void IsValidDeviceToken_Empty_ReturnsFalse()
    {
        _service.IsValidDeviceToken("").Should().BeFalse();
    }

    [Fact]
    public void IsValidDeviceToken_Whitespace_ReturnsFalse()
    {
        _service.IsValidDeviceToken("   ").Should().BeFalse();
    }

    #endregion
}
