import nodemailer from 'nodemailer';

export interface DigestData {
  lowStock: Array<{
    sku: string;
    location: string;
    onHand: number;
    daysCover: number;
  }>;
  overduePOs: Array<{
    poNumber: string;
    supplier: string;
    expectedDate: string;
    status: string;
  }>;
  tasksOverdue: Array<{
    title: string;
    assignee: string;
    dueDate: string;
  }>;
  reconAnomalies: Array<{
    type: string;
    sku?: string;
    delta: string;
  }>;
  summary: {
    date: string;
    totalIssues: number;
    criticalAlerts: number;
  };
}

export interface SmtpSettings {
  smtpHost: string;
  smtpPort: number;
  username: string;
  password: string;
}

export function buildDigestPayload(): DigestData {
  return {
    lowStock: [
      { sku: "WIDGET-001", location: "US West", onHand: 12, daysCover: 3 },
      { sku: "GADGET-205", location: "EU Central", onHand: 5, daysCover: 1 },
      { sku: "TOOL-442", location: "APAC", onHand: 8, daysCover: 2 },
    ],
    overduePOs: [
      { poNumber: "PO-2024-001", supplier: "TechCorp Ltd", expectedDate: "2024-01-15", status: "Overdue" },
      { poNumber: "PO-2024-008", supplier: "Global Supply Co", expectedDate: "2024-01-12", status: "Overdue" },
    ],
    tasksOverdue: [
      { title: "Review inventory levels for Q1", assignee: "Admin", dueDate: "2024-01-16" },
      { title: "Approve supplier contract renewal", assignee: "Manager", dueDate: "2024-01-14" },
    ],
    reconAnomalies: [
      { type: "Payout Mismatch", sku: "BOOK-101", delta: "-$45.20" },
      { type: "Order Count Discrepancy", sku: "SHIRT-M-BLU", delta: "+15 units" },
    ],
    summary: {
      date: new Date().toLocaleDateString(),
      totalIssues: 7,
      criticalAlerts: 3,
    }
  };
}

export function renderDigestHtml(payload: DigestData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flowventory Daily Digest</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 16px; }
        .content { padding: 30px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #1a1a1a; font-size: 20px; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #22c55e; }
        .alert-item { background-color: #f8f9fa; border-left: 4px solid #dc3545; padding: 15px; margin-bottom: 10px; border-radius: 0 4px 4px 0; }
        .po-item { background-color: #fff8e1; border-left: 4px solid #ff9800; padding: 15px; margin-bottom: 10px; border-radius: 0 4px 4px 0; }
        .task-item { background-color: #fff3e0; border-left: 4px solid #f57c00; padding: 15px; margin-bottom: 10px; border-radius: 0 4px 4px 0; }
        .recon-item { background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin-bottom: 10px; border-radius: 0 4px 4px 0; }
        .item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
        .item-title { font-weight: 600; color: #1a1a1a; }
        .item-meta { font-size: 14px; color: #666; }
        .item-value { font-weight: 600; }
        .critical { color: #dc3545; }
        .warning { color: #f57c00; }
        .info { color: #2196f3; }
        .view-link { display: inline-block; margin-top: 15px; padding: 8px 16px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 4px; font-size: 14px; }
        .view-link:hover { background-color: #16a34a; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e5e5e5; }
        .footer p { margin: 0; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏢 Flowventory Daily Digest</h1>
            <p>Business Intelligence Summary for ${payload.summary.date}</p>
        </div>
        
        <div class="content">
            ${payload.lowStock.length > 0 ? `
            <div class="section">
                <h2>🚨 Low Stock Alerts</h2>
                ${payload.lowStock.map(item => `
                <div class="alert-item">
                    <div class="item-header">
                        <span class="item-title">${item.sku}</span>
                        <span class="item-value critical">${item.daysCover} days cover</span>
                    </div>
                    <div class="item-meta">${item.location} • ${item.onHand} units remaining</div>
                </div>
                `).join('')}
                <a href="#" class="view-link">View in Inventory →</a>
            </div>
            ` : ''}

            ${payload.overduePOs.length > 0 ? `
            <div class="section">
                <h2>📦 Overdue Purchase Orders</h2>
                ${payload.overduePOs.map(po => `
                <div class="po-item">
                    <div class="item-header">
                        <span class="item-title">${po.poNumber}</span>
                        <span class="item-value warning">${po.status}</span>
                    </div>
                    <div class="item-meta">${po.supplier} • Expected: ${po.expectedDate}</div>
                </div>
                `).join('')}
                <a href="#" class="view-link">View Purchase Orders →</a>
            </div>
            ` : ''}

            ${payload.tasksOverdue.length > 0 ? `
            <div class="section">
                <h2>⏰ Overdue Tasks</h2>
                ${payload.tasksOverdue.map(task => `
                <div class="task-item">
                    <div class="item-header">
                        <span class="item-title">${task.title}</span>
                        <span class="item-value warning">Due: ${task.dueDate}</span>
                    </div>
                    <div class="item-meta">Assigned to: ${task.assignee}</div>
                </div>
                `).join('')}
                <a href="#" class="view-link">View Action Center →</a>
            </div>
            ` : ''}

            ${payload.reconAnomalies.length > 0 ? `
            <div class="section">
                <h2>🔍 Reconciliation Anomalies</h2>
                ${payload.reconAnomalies.map(anomaly => `
                <div class="recon-item">
                    <div class="item-header">
                        <span class="item-title">${anomaly.type}</span>
                        <span class="item-value info">${anomaly.delta}</span>
                    </div>
                    ${anomaly.sku ? `<div class="item-meta">SKU: ${anomaly.sku}</div>` : ''}
                </div>
                `).join('')}
                <a href="#" class="view-link">View Reconciliation →</a>
            </div>
            ` : ''}
        </div>
        
        <div class="footer">
            <p>Generated by Flowventory Business Intelligence • ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>
  `;
}

function createTransporter(smtpSettings: SmtpSettings) {
  return nodemailer.createTransport({
    host: smtpSettings.smtpHost,
    port: smtpSettings.smtpPort,
    secure: smtpSettings.smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpSettings.username,
      pass: smtpSettings.password,
    },
    tls: {
      // Do not fail on invalid certs for development
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });
}

export async function sendDigestEmail(
  recipients: string[],
  smtpSettings: SmtpSettings
): Promise<boolean> {
  try {
    const payload = buildDigestPayload();
    const htmlContent = renderDigestHtml(payload);
    
    const transporter = createTransporter(smtpSettings);
    
    const mailOptions = {
      from: smtpSettings.username,
      to: recipients.join(', '),
      subject: `Flowventory Daily Digest - ${payload.summary.date}`,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log("Daily digest sent successfully to:", recipients);
    return true;
  } catch (error) {
    console.error("Error sending daily digest:", error);
    return false;
  }
}

export async function sendTestEmail(
  recipients: string[],
  smtpSettings: SmtpSettings
): Promise<boolean> {
  try {
    const transporter = createTransporter(smtpSettings);
    
    const mailOptions = {
      from: smtpSettings.username,
      to: recipients.join(', '),
      subject: 'Flowventory Test Email',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 24px;">🧪 Test Email</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your SMTP configuration is working correctly!</p>
          </div>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e;">
            <h2 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 18px;">✅ SMTP Settings Verified</h2>
            <p style="margin: 0; color: #666;">Your email configuration has been successfully tested. You can now receive daily digest emails and notifications from Flowventory.</p>
          </div>
          <div style="margin-top: 20px; padding: 15px; background-color: #fff; border-radius: 4px; border: 1px solid #e5e5e5;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              <strong>Test Details:</strong><br>
              Sent at: ${new Date().toLocaleString()}<br>
              Recipients: ${recipients.join(', ')}<br>
              From: Flowventory Business Intelligence
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Test email sent successfully to:", recipients);
    return true;
  } catch (error) {
    console.error("Error sending test email:", error);
    return false;
  }
}