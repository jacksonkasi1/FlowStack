// ** import types
import type { Env } from "./types";

export interface EmailAddress {
  address: string;
  name?: string;
}

export interface Personalization {
  email_address: EmailAddress;
  merge_info?: Record<string, string>;
}

export interface EmailAttachment {
  content: string;
  mime_type: string;
  name: string;
}

export interface CommonEmailProps {
  subject: string;
  html: string;
  from: EmailAddress;
  attachments?: EmailAttachment[];
}

export interface SendEmailProps extends CommonEmailProps {
  to: EmailAddress;
}

export interface SendBatchEmailProps extends CommonEmailProps {
  to: Personalization[];
}

export interface EmailConfig {
  apiKey: string;
  url?: string;
}

export interface EmailClient {
  sendEmail: (
    props: SendEmailProps,
  ) => Promise<{ success: boolean; data?: unknown; message?: string }>;
  sendBatchEmail: (
    props: SendBatchEmailProps,
  ) => Promise<{ success: boolean; data?: unknown }>;
}

export function createEmailClient(config: EmailConfig): EmailClient {
  const apiUrl = config.url || "https://api.zeptomail.in/";
  const apiKey = config.apiKey;

  if (!apiKey) {
    throw new Error("ZeptoMail API key is required");
  }

  const getAuthHeader = () =>
    apiKey.startsWith("Zoho-enczapikey") ? apiKey : `Zoho-enczapikey ${apiKey}`;

  const sendEmail = async (props: SendEmailProps) => {
    const url = `${apiUrl.replace(/\/+$/, "")}/v1.1/email`;

    const payload: Record<string, unknown> = {
      from: {
        address: props.from.address,
        name: props.from.name || props.from.address,
      },
      to: [
        {
          email_address: {
            address: props.to.address,
            name: props.to.name || props.to.address,
          },
        },
      ],
      subject: props.subject,
      htmlbody: props.html,
    };

    if (props.attachments && props.attachments.length > 0) {
      payload.attachments = props.attachments;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Email API error: ${response.status} - ${errorText}`);
    }

    const responseText = await response.text().catch(() => "");

    if (!responseText || !responseText.trim()) {
      return { success: true, message: "Email sent successfully" };
    }

    try {
      const data = JSON.parse(responseText);
      return { success: true, data };
    } catch {
      return { success: true, message: "Email sent successfully" };
    }
  };

  const sendBatchEmail = async (props: SendBatchEmailProps) => {
    const url = `${apiUrl.replace(/\/+$/, "")}/v1.1/email/batch`;

    const payload: Record<string, unknown> = {
      from: props.from,
      to: props.to,
      subject: props.subject,
      htmlbody: props.html,
    };

    if (props.attachments && props.attachments.length > 0) {
      payload.attachments = props.attachments;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Batch email API error: ${response.status} - ${JSON.stringify(errorData)}`,
      );
    }

    const data = await response.json().catch(() => ({}));
    return { success: true, data };
  };

  return { sendEmail, sendBatchEmail };
}

export function createEmailClientFromEnv(env?: Env): EmailClient {
  const apiKey = env?.ZEPTOMAIL_API_KEY || process.env.ZEPTOMAIL_API_KEY;
  const url = env?.ZEPTO_URL || process.env.ZEPTO_URL;

  if (!apiKey) {
    throw new Error("ZEPTOMAIL_API_KEY is required");
  }

  return createEmailClient({ apiKey, url });
}
