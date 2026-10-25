/** Shared brand defaults; the email logo is a replaceable demonstration asset. */
export const BRAND_CONFIG = {
  name: "FlowStack",
  tagline: "A little setup. A clear start.",
  website: "https://example.com",
  logoUrl: "https://www.peacockindia.com/peacock-logo-sm.png",
  logoAlt: "Peacock India",
  socialLinks: [
    {
      name: "Twitter",
      href: "https://example.com/twitter",
      iconUrl:
        "https://visions3.s3.ap-south-1.amazonaws.com/email-assets/twitter.png",
    },
    {
      name: "Facebook",
      href: "https://example.com/facebook",
      iconUrl:
        "https://visions3.s3.ap-south-1.amazonaws.com/email-assets/Facebook.png",
    },
    {
      name: "Instagram",
      href: "https://example.com/instagram",
      iconUrl:
        "https://visions3.s3.ap-south-1.amazonaws.com/email-assets/instagram.png",
    },
  ],
  accentColor: "#ED2124",
  backgroundColor: "#FEE9EA",
  authImage: "/auth/workspace-placeholder.svg",
};

export const AUTH_LOCALIZATION = {
  NAME_PLACEHOLDER: "Enter your name",
  EMAIL_PLACEHOLDER: "Enter your email",
  PASSWORD_PLACEHOLDER: "Enter your password",
  NEW_PASSWORD_PLACEHOLDER: "Create a new password",
  CONFIRM_PASSWORD_PLACEHOLDER: "Re-enter your new password",
  CURRENT_PASSWORD_PLACEHOLDER: "Enter your current password",
};
