import { sendDigestEmail, type SmtpSettings } from './digestService';

interface DigestSchedulerConfig {
  enabled: boolean;
  time: string; // HH:mm format
  recipients: string[];
  smtpSettings: SmtpSettings;
}

class DigestScheduler {
  private checkInterval: NodeJS.Timeout | null = null;
  private lastSent: string | null = null;
  private config: DigestSchedulerConfig | null = null;

  constructor() {
    this.startScheduler();
  }

  updateConfig(config: DigestSchedulerConfig) {
    this.config = config;
    console.log('Digest scheduler config updated:', {
      enabled: config.enabled,
      time: config.time,
      recipientCount: config.recipients.length,
      smtpConfigured: !!config.smtpSettings.smtpHost
    });
  }

  private startScheduler() {
    // Check every 5 minutes
    this.checkInterval = setInterval(() => {
      this.checkAndSendDigest();
    }, 5 * 60 * 1000);

    console.log('Daily digest scheduler started - checking every 5 minutes');
  }

  private async checkAndSendDigest() {
    if (!this.config || !this.config.enabled) {
      return;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDate = now.toDateString();

    // Check if it's time to send and we haven't sent today
    if (currentTime === this.config.time && this.lastSent !== currentDate) {
      console.log('Sending scheduled daily digest...');
      
      try {
        const success = await sendDigestEmail(this.config.recipients, this.config.smtpSettings);
        if (success) {
          this.lastSent = currentDate;
          console.log('Scheduled daily digest sent successfully');
        } else {
          console.error('Failed to send scheduled daily digest');
        }
      } catch (error) {
        console.error('Error sending scheduled daily digest:', error);
      }
    }
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Daily digest scheduler stopped');
    }
  }

  // Get status for monitoring
  getStatus() {
    return {
      enabled: this.config?.enabled || false,
      scheduledTime: this.config?.time || null,
      lastSent: this.lastSent,
      nextCheck: this.checkInterval ? 'Running' : 'Stopped',
      recipientCount: this.config?.recipients.length || 0
    };
  }
}

export const digestScheduler = new DigestScheduler();