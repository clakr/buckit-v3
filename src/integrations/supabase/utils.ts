const authErrorCodeCustomMessagesMapping: Record<string, string> = {
	// Authentication & Session Errors
	invalid_credentials:
		"Invalid email or password. Please check your credentials and try again.",
	bad_jwt: "Your session is invalid. Please sign in again.",
	session_not_found: "No active session found. Please sign in to continue.",
	session_expired:
		"Your session has expired. Please sign in again to continue.",
	not_admin: "You need administrator privileges to perform this action.",
	no_authorization: "You are not authorized to perform this action.",
	reauthentication_needed: "Please sign in again to confirm your identity.",
	reauthentication_not_valid:
		"Re-authentication failed. Please try signing in again.",

	// User Account Errors
	user_not_found:
		"No account found with these credentials. Please check your email or sign up.",
	user_already_exists:
		"An account with this email already exists. Please sign in instead.",
	email_exists:
		"This email is already registered. Please sign in or use a different email.",
	phone_exists:
		"This phone number is already registered. Please sign in or use a different number.",
	user_banned:
		"Your account has been suspended. Please contact support for assistance.",
	user_sso_managed:
		"This account is managed by your organization. Please use your organization's sign-in method.",

	// Email & Phone Verification
	email_not_confirmed:
		"Please verify your email address before signing in. Check your inbox for a verification link.",
	phone_not_confirmed: "Please verify your phone number before signing in.",
	email_address_not_authorized:
		"This email address is not authorized. Please contact your administrator.",
	email_address_invalid: "Please enter a valid email address.",
	provider_email_needs_verification:
		"Please verify your email address with your provider before continuing.",

	// Password Errors
	weak_password:
		"Password is too weak. Please use at least 8 characters with a mix of letters, numbers, and symbols.",
	same_password: "New password must be different from your current password.",

	// OAuth & SSO Errors
	bad_oauth_state: "Authentication failed. Please try signing in again.",
	bad_oauth_callback:
		"Authentication callback failed. Please try signing in again.",
	oauth_provider_not_supported:
		"This sign-in method is not supported. Please use a different method.",
	provider_disabled:
		"This sign-in method is currently disabled. Please try another method.",
	sso_provider_not_found:
		"SSO provider not found. Please contact your administrator.",
	sso_domain_already_exists: "This domain is already configured for SSO.",

	// MFA Errors
	mfa_factor_not_found:
		"Multi-factor authentication method not found. Please set up MFA again.",
	mfa_challenge_expired: "MFA challenge expired. Please request a new code.",
	mfa_verification_failed:
		"Invalid verification code. Please check and try again.",
	mfa_verification_rejected: "Verification was rejected. Please try again.",
	mfa_ip_address_mismatch:
		"Sign-in attempt from unrecognized location. Please verify your identity.",
	too_many_enrolled_mfa_factors:
		"Maximum number of MFA methods reached. Please remove one before adding another.",
	mfa_factor_name_conflict: "An MFA method with this name already exists.",
	mfa_phone_enroll_not_enabled: "Phone-based MFA enrollment is not available.",
	mfa_phone_verify_not_enabled:
		"Phone-based MFA verification is not available.",
	mfa_totp_enroll_not_enabled: "Authenticator app enrollment is not available.",
	mfa_totp_verify_not_enabled:
		"Authenticator app verification is not available.",
	mfa_webauthn_enroll_not_enabled: "Security key enrollment is not available.",
	mfa_webauthn_verify_not_enabled:
		"Security key verification is not available.",
	mfa_verified_factor_exists: "This MFA method is already verified.",
	insufficient_aal:
		"Additional authentication required. Please complete multi-factor authentication.",

	// Token & Refresh Errors
	refresh_token_not_found: "Unable to refresh session. Please sign in again.",
	refresh_token_already_used: "Session refresh failed. Please sign in again.",
	unexpected_audience: "Authentication token is invalid for this application.",

	// Rate Limiting
	over_request_rate_limit:
		"Too many requests. Please wait a moment and try again.",
	over_email_send_rate_limit:
		"Too many email requests. Please wait before requesting another email.",
	over_sms_send_rate_limit:
		"Too many SMS requests. Please wait before requesting another SMS.",

	// Provider & Service Errors
	email_provider_disabled:
		"Email sign-in is currently disabled. Please try another method.",
	phone_provider_disabled:
		"Phone sign-in is currently disabled. Please try another method.",
	anonymous_provider_disabled: "Anonymous sign-in is not available.",
	signup_disabled: "New account registration is currently disabled.",
	manual_linking_disabled:
		"Account linking is not available. Please contact support.",

	// OTP Errors
	otp_expired: "Verification code has expired. Please request a new one.",
	otp_disabled: "One-time password authentication is not available.",

	// Identity Management
	identity_not_found:
		"Linked account not found. Please link your account again.",
	identity_already_exists: "This account is already linked to another user.",
	single_identity_not_deletable:
		"Cannot remove your only sign-in method. Please add another method first.",
	email_conflict_identity_not_deletable:
		"Cannot remove this identity due to email conflict.",

	// SAML Errors
	saml_provider_disabled: "SAML authentication is currently disabled.",
	saml_relay_state_not_found:
		"SAML authentication state not found. Please try signing in again.",
	saml_relay_state_expired:
		"SAML authentication expired. Please try signing in again.",
	saml_idp_not_found:
		"SAML identity provider not found. Please contact your administrator.",
	saml_assertion_no_user_id:
		"SAML response missing user ID. Please contact your administrator.",
	saml_assertion_no_email:
		"SAML response missing email. Please contact your administrator.",
	saml_metadata_fetch_failed:
		"Failed to fetch SAML configuration. Please try again later.",
	saml_idp_already_exists: "SAML identity provider already configured.",
	saml_entity_id_mismatch:
		"SAML configuration mismatch. Please contact your administrator.",

	// Flow State Errors
	flow_state_not_found: "Authentication flow expired. Please start over.",
	flow_state_expired: "Authentication session expired. Please try again.",

	// Invite Errors
	invite_not_found:
		"Invalid or expired invitation. Please request a new invitation.",

	// Captcha
	captcha_failed: "Captcha verification failed. Please try again.",

	// Code Verifier
	bad_code_verifier:
		"Invalid authentication code. Please try signing in again.",

	// SMS Errors
	sms_send_failed:
		"Failed to send SMS. Please check your phone number and try again.",

	// Nonce Errors
	reauth_nonce_missing: "Re-authentication request invalid. Please try again.",

	// Hook Errors
	hook_timeout: "Request processing timeout. Please try again.",
	hook_timeout_after_retry:
		"Request failed after multiple attempts. Please try again later.",
	hook_payload_over_size_limit:
		"Request data too large. Please reduce the size and try again.",
	hook_payload_invalid_content_type:
		"Invalid request format. Please try again.",

	// General Errors
	unexpected_failure:
		"An unexpected error occurred. Please try again or contact support if the issue persists.",
	validation_failed: "Please check your input and try again.",
	bad_json: "Invalid request format. Please refresh and try again.",
	conflict: "A conflict occurred. Please refresh and try again.",
	request_timeout:
		"Request timed out. Please check your connection and try again.",
};

export function getErrorMessage(errorCode: string | undefined): string {
	if (!errorCode) {
		return "An unexpected error occurred. Please try again or contact support if the issue persists.";
	}

	return (
		authErrorCodeCustomMessagesMapping[errorCode] ||
		`An error occurred: ${errorCode}. Please try again or contact support.`
	);
}
