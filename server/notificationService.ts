import { Task } from "@shared/schema";

interface TeamsCard {
  "@type": "MessageCard";
  "@context": "http://schema.org/extensions";
  summary: string;
  themeColor: string;
  sections: Array<{
    activityTitle: string;
    facts: Array<{
      name: string;
      value: string;
    }>;
    potentialAction?: Array<{
      "@type": "OpenUri";
      name: string;
      targets: Array<{
        os: "default";
        uri: string;
      }>;
    }>;
  }>;
}

export class NotificationService {
  private readonly baseUrl: string;

  constructor() {
    // Use REPLIT_DOMAINS or fallback to localhost
    const replitDomains = process.env.REPLIT_DOMAINS;
    if (replitDomains) {
      this.baseUrl = `https://${replitDomains.split(',')[0]}`;
    } else {
      this.baseUrl = process.env.BASE_URL || "http://localhost:5000";
    }
  }

  async notifyP1Task(task: Task): Promise<void> {
    if (task.priority !== "P1") {
      return; // Only notify for P1 tasks
    }

    try {
      const teamsWebhookUrl = process.env.TEAMS_WEBHOOK_URL;
      
      if (teamsWebhookUrl) {
        await this.sendTeamsNotification(task, teamsWebhookUrl);
        console.log(`Teams notification sent for P1 task: ${task.id}`);
      } else if (this.hasEmailConfig()) {
        await this.sendEmailNotification(task);
        console.log(`Email notification sent for P1 task: ${task.id}`);
      } else {
        console.log("No notification configuration found (TEAMS_WEBHOOK_URL or SMTP settings)");
      }
    } catch (error) {
      console.error("Failed to send P1 task notification:", error);
    }
  }

  private async sendTeamsNotification(task: Task, webhookUrl: string): Promise<void> {
    const actionCenterUrl = `${this.baseUrl}/action-center?taskId=${task.id}`;
    const dueAtFormatted = task.dueAt 
      ? new Intl.DateTimeFormat('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short'
        }).format(new Date(task.dueAt))
      : 'Not set';

    const card: TeamsCard = {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      summary: `Critical Task Created: ${task.title}`,
      themeColor: "FF0000", // Red for P1 priority
      sections: [
        {
          activityTitle: "🚨 Critical Task Created",
          facts: [
            {
              name: "Title",
              value: task.title
            },
            {
              name: "Type",
              value: task.type
            },
            {
              name: "Priority",
              value: task.priority
            },
            {
              name: "Due Date", 
              value: dueAtFormatted
            },
            {
              name: "Status",
              value: task.status
            }
          ],
          potentialAction: [
            {
              "@type": "OpenUri",
              name: "View in Action Center",
              targets: [
                {
                  os: "default",
                  uri: actionCenterUrl
                }
              ]
            }
          ]
        }
      ]
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(card),
    });

    if (!response.ok) {
      throw new Error(`Teams webhook failed: ${response.status} ${response.statusText}`);
    }
  }

  private async sendEmailNotification(task: Task): Promise<void> {
    const { sendEmail } = await import("./emailService");
    
    const actionCenterUrl = `${this.baseUrl}/action-center?taskId=${task.id}`;
    const dueAtFormatted = task.dueAt 
      ? new Intl.DateTimeFormat('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short'
        }).format(new Date(task.dueAt))
      : 'Not set';

    const subject = `🚨 Critical Task Created: ${task.title}`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🚨 Critical Task Created</h1>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">${task.title}</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">Type:</td>
              <td style="padding: 8px 0; color: #6b7280;">${task.type}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">Priority:</td>
              <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">${task.priority}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">Due Date:</td>
              <td style="padding: 8px 0; color: #6b7280;">${dueAtFormatted}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">Status:</td>
              <td style="padding: 8px 0; color: #6b7280;">${task.status}</td>
            </tr>
          </table>

          ${task.notes ? `
            <div style="margin: 16px 0;">
              <strong style="color: #374151;">Notes:</strong>
              <p style="color: #6b7280; margin: 8px 0;">${task.notes}</p>
            </div>
          ` : ''}
        </div>
        
        <div style="background-color: #1f2937; padding: 20px; border-radius: 0 0 8px 8px; text-align: center;">
          <a href="${actionCenterUrl}" 
             style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; font-weight: bold;">
            View in Action Center
          </a>
        </div>
      </div>
    `;

    const textBody = `
Critical Task Created

Title: ${task.title}
Type: ${task.type}
Priority: ${task.priority}
Due Date: ${dueAtFormatted}
Status: ${task.status}
${task.notes ? `Notes: ${task.notes}` : ''}

View in Action Center: ${actionCenterUrl}
    `;

    await sendEmail({
      to: process.env.NOTIFICATION_EMAIL || process.env.SMTP_FROM!,
      from: process.env.SMTP_FROM!,
      subject,
      text: textBody,
      html: htmlBody,
    });
  }

  private hasEmailConfig(): boolean {
    return !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM
    );
  }
}

export const notificationService = new NotificationService();