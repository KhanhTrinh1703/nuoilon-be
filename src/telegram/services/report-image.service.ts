import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import QuickChart from 'quickchart-js';
import { promises as fs } from 'fs';
import * as path from 'path';
import { html } from 'satori-html';
import { MonthlyInvestmentReportRepository } from '../../report/repositories/monthly-investment-report.repository';
import { FundPriceRepository } from '../repositories/fund-price.repository';
import { MonthlyInvestmentReport } from '../../database/entities/monthly-investment-report.entity';

interface ReportSummary {
  fundName: string;
  rangeLabel: string;
  totalInvestment: number;
  totalCertificates: number;
  currentValue: number;
  profitValue: number;
  profitRatio: number;
  navPrice: number;
  averageNavPrice: number;
  months: number;
}

interface TemplateData {
  fundName: string;
  rangeLabel: string;
  totalInvestmentLabel: string;
  totalCertificatesLabel: string;
  currentValueLabel: string;
  navLabel: string;
  avgNavLabel: string;
  monthsLabel: string;
  profitRatioLabel: string;
  profitDescription: string;
  profitPositive: boolean;
  profitValueLabel: string;
  reportDateLabel: string;
  chartUrl: string;
}

interface ChartData {
  labels: string[];
  navSeries: number[];
  investmentSeries: number[];
}

@Injectable()
export class ReportImageService {
  private static readonly DEFAULT_FUND = 'E1VFVN30';
  private static readonly FONT_URL =
    'https://fonts.gstatic.com/s/ibmplexsans/v19/zYXgKVElMYYaJe8bpLHnCwDKhd5013WhCL8V.woff2';
  private static readonly FONT_BOLD_URL =
    'https://fonts.gstatic.com/s/ibmplexsans/v19/zYX9KVElMYYaJe8bpLHnCwDKjSL9AIxsdP3pBmtF8A.woff2';

  private readonly logger = new Logger(ReportImageService.name);

  constructor(
    private readonly monthlyInvestmentReportRepository: MonthlyInvestmentReportRepository,
    private readonly fundPriceRepository: FundPriceRepository,
  ) {}

  async generateReportImage(options?: {
    fundName?: string;
    months?: number;
  }): Promise<{ buffer: Buffer; caption: string }> {
    try {
      const fundName =
        options?.fundName?.trim() || ReportImageService.DEFAULT_FUND;
      const months = options?.months ?? 12;

      const reports: MonthlyInvestmentReport[] =
        await this.monthlyInvestmentReportRepository
          .createQueryBuilder('report')
          .where('report.fundName = :fundName', { fundName })
          .orderBy('report.reportMonth', 'DESC')
          .limit(months)
          .getMany();

      const chronologicalReports: MonthlyInvestmentReport[] = reports
        .slice()
        .sort((a, b) => a.reportMonth.localeCompare(b.reportMonth));

      const summary = await this.buildSummary(fundName, chronologicalReports);
      const chart = this.buildChartData(chronologicalReports);
      const chartUrl = this.generateChartUrl(chart);
      const templateData = this.buildTemplateData(summary, chartUrl);

      // Build HTML template and convert to React-like element
      const htmlTemplate = this.buildHtmlTemplate(templateData);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const element = html(htmlTemplate);

      // Dynamic import for @vercel/og (ESM module)
      const { ImageResponse } = await import('@vercel/og');

      // Generate image using @vercel/og
      const image = new ImageResponse(element, {
        width: 1200,
        height: 675,
      });

      const arrayBuffer = await image.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await this.persistImage(buffer);

      return {
        buffer,
        caption: this.buildCaption(summary),
      };
    } catch (error) {
      this.logger.error('Failed to generate report image', error);
      throw error;
    }
  }

  private async loadFont(url: string): Promise<ArrayBuffer> {
    const response = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
    });
    return response.data;
  }

  private async buildSummary(
    fundName: string,
    reports: MonthlyInvestmentReport[],
  ): Promise<ReportSummary> {
    const latestReport = reports.length
      ? reports[reports.length - 1]
      : undefined;

    const totalInvestment = latestReport
      ? Number(latestReport.totalInvestment)
      : 0;
    const totalCertificates = latestReport
      ? Number(latestReport.totalCertificates)
      : 0;

    const fundPrice = await this.fundPriceRepository.findByName(fundName);
    const navPrice = fundPrice
      ? Number(fundPrice.price)
      : latestReport
        ? Number(latestReport.latestFundPrice)
        : 0;

    const currentValue = totalCertificates * navPrice * 1000;
    const profitValue = currentValue - totalInvestment;
    const profitRatio =
      totalInvestment > 0 ? (profitValue / totalInvestment) * 100 : 0;

    const averageNavPrice =
      reports.length > 0
        ? reports.reduce(
            (sum, report) => sum + Number(report.latestFundPrice),
            0,
          ) / reports.length
        : navPrice;

    return {
      fundName,
      rangeLabel: this.buildRangeLabel(reports),
      totalInvestment,
      totalCertificates,
      currentValue,
      profitValue,
      profitRatio,
      navPrice,
      averageNavPrice,
      months: reports.length,
    };
  }

  private buildChartData(reports: MonthlyInvestmentReport[]): ChartData {
    if (!reports.length) {
      return {
        labels: ['Không có dữ liệu'],
        navSeries: [0],
        investmentSeries: [0],
      };
    }

    return {
      labels: reports.map((report) =>
        this.formatMonthLabel(report.reportMonth),
      ),
      navSeries: reports.map((report) =>
        Math.round(Number(report.certificatesValue)),
      ),
      investmentSeries: reports.map((report) =>
        Math.round(Number(report.totalInvestment)),
      ),
    };
  }

  private generateChartUrl(data: ChartData): string {
    const chart = new QuickChart();
    chart.setConfig({
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Giá trị quỹ',
            data: data.navSeries,
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#3B82F6',
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2,
          },
          {
            label: 'Vốn đầu tư',
            data: data.investmentSeries,
            borderColor: '#64748B',
            backgroundColor: 'rgba(100, 116, 139, 0.05)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#64748B',
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2,
            borderDash: [6, 6],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#475569',
              usePointStyle: true,
              padding: 16,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: '#64748B' },
            grid: { display: false },
          },
          y: {
            ticks: { color: '#64748B' },
            grid: { color: '#E2E8F0' },
          },
        },
      },
    });
    chart.setBackgroundColor('white');
    chart.setWidth(700);
    chart.setHeight(350);
    chart.setDevicePixelRatio(2);

    return chart.getUrl();
  }

  private buildTemplateData(
    summary: ReportSummary,
    chartUrl: string,
  ): TemplateData {
    const profitPositive = summary.profitValue >= 0;
    return {
      fundName: summary.fundName,
      rangeLabel: summary.rangeLabel,
      totalInvestmentLabel: `${this.formatCurrency(summary.totalInvestment)} VNĐ`,
      totalCertificatesLabel: this.formatCertificates(
        summary.totalCertificates,
      ),
      currentValueLabel: `${this.formatCurrency(summary.currentValue)} VNĐ`,
      navLabel: `${this.formatCurrency(summary.navPrice * 1000)} VNĐ`,
      avgNavLabel: `${this.formatCurrency(summary.averageNavPrice * 1000)} VNĐ`,
      monthsLabel: summary.months ? `${summary.months} tháng` : '0 tháng',
      profitRatioLabel: `${profitPositive ? '+' : ''}${summary.profitRatio.toFixed(2)}%`,
      profitDescription: profitPositive
        ? 'Hiệu suất đầu tư tích cực'
        : 'Danh mục đang ghi nhận lỗ',
      profitPositive,
      profitValueLabel: `${profitPositive ? '+' : ''}${this.formatCurrency(summary.profitValue)} VNĐ`,
      reportDateLabel: this.buildReportDateLabel(),
      chartUrl,
    };
  }

  private buildHtmlTemplate(data: TemplateData): string {
    const profitBg = data.profitPositive
      ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
      : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)';

    const profitColor = data.profitPositive ? '#059669' : '#DC2626';

    return `
      <div style="display: flex; flex-direction: column; width: 100%; height: 100%; padding: 24px; background: linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%); font-family: IBM Plex Sans;">
        
        <!-- Top Row -->
        <div style="display: flex; width: 100%; margin-bottom: 16px; gap: 16px;">
          
          <!-- Header Card -->
          <div style="display: flex; flex: 1; background-color: white; border-radius: 16px; padding: 20px; border: 1px solid #E2E8F0; align-items: center; justify-content: space-between;">
            <div style="display: flex; flex-direction: column;">
              <span style="font-size: 28px; font-weight: 700; color: #0F172A;">${data.fundName}</span>
              <span style="font-size: 14px; color: #475569; margin-top: 4px;">Thời gian: ${data.rangeLabel}</span>
            </div>
            <div style="display: flex; width: 48px; height: 48px; background-color: #EFF6FF; border-radius: 12px; align-items: center; justify-content: center;">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
          </div>
          
          <!-- Profit Card -->
          <div style="display: flex; flex-direction: column; width: 260px; background: ${profitBg}; border-radius: 16px; padding: 20px; color: white;">
            <span style="font-size: 12px; font-weight: 500; text-transform: uppercase; opacity: 0.9;">Tỷ Lệ Lợi Nhuận</span>
            <span style="font-size: 42px; font-weight: 700; margin-top: 4px;">${data.profitRatioLabel}</span>
            <span style="font-size: 12px; opacity: 0.8; margin-top: 8px;">${data.profitDescription}</span>
          </div>
          
        </div>
        
        <!-- Middle Row -->
        <div style="display: flex; width: 100%; margin-bottom: 16px; gap: 16px; flex: 1;">
          
          <!-- Chart Card -->
          <div style="display: flex; flex-direction: column; flex: 2; background-color: white; border-radius: 16px; padding: 20px; border: 1px solid #E2E8F0;">
            <div style="display: flex; flex-direction: column;">
              <span style="font-size: 16px; font-weight: 600; color: #0F172A;">Biểu Đồ Giá Trị Quỹ</span>
              <span style="font-size: 12px; color: #64748B; margin-top: 4px;">So sánh giá trị quỹ và vốn đầu tư</span>
            </div>
            <img src="${data.chartUrl}" style="width: 100%; height: 280px; object-fit: contain; margin-top: 12px; border-radius: 8px;" />
          </div>
          
          <!-- Stats Column -->
          <div style="display: flex; flex-direction: column; width: 300px; gap: 12px;">
            
            <!-- Total Investment -->
            <div style="display: flex; flex-direction: column; background-color: white; border-radius: 12px; padding: 16px; border: 1px solid #E2E8F0;">
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" style="margin-right: 8px;">
                  <path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"/>
                </svg>
                <span style="font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase;">Tổng Vốn</span>
              </div>
              <span style="font-size: 20px; font-weight: 700; color: #0F172A;">${data.totalInvestmentLabel}</span>
            </div>
            
            <!-- Current Value -->
            <div style="display: flex; flex-direction: column; background-color: white; border-radius: 12px; padding: 16px; border: 1px solid #E2E8F0;">
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" style="margin-right: 8px;">
                  <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span style="font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase;">Giá Trị Hiện Tại</span>
              </div>
              <span style="font-size: 20px; font-weight: 700; color: #0F172A;">${data.currentValueLabel}</span>
            </div>
            
            <!-- Certificates -->
            <div style="display: flex; flex-direction: column; background-color: white; border-radius: 12px; padding: 16px; border: 1px solid #E2E8F0;">
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" style="margin-right: 8px;">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <span style="font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase;">Số CCQ Sở Hữu</span>
              </div>
              <span style="font-size: 20px; font-weight: 700; color: #0F172A;">${data.totalCertificatesLabel}</span>
            </div>
            
            <!-- Profit Value -->
            <div style="display: flex; flex-direction: column; background-color: white; border-radius: 12px; padding: 16px; border: 1px solid #E2E8F0;">
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase;">Lợi Nhuận</span>
              </div>
              <span style="font-size: 20px; font-weight: 700; color: ${profitColor};">${data.profitValueLabel}</span>
            </div>
            
          </div>
          
        </div>
        
        <!-- Bottom Row -->
        <div style="display: flex; width: 100%; gap: 16px;">
          
          <!-- Additional Info -->
          <div style="display: flex; flex: 1; background-color: white; border-radius: 12px; padding: 16px; border: 1px solid #E2E8F0; gap: 32px;">
            <div style="display: flex; flex-direction: column;">
              <span style="font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase; margin-bottom: 4px;">NAV/CCQ Hiện Tại</span>
              <span style="font-size: 18px; font-weight: 700; color: #0F172A;">${data.navLabel}</span>
            </div>
            <div style="display: flex; flex-direction: column;">
              <span style="font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase; margin-bottom: 4px;">NAV/CCQ Trung Bình</span>
              <span style="font-size: 18px; font-weight: 700; color: #0F172A;">${data.avgNavLabel}</span>
            </div>
            <div style="display: flex; flex-direction: column;">
              <span style="font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase; margin-bottom: 4px;">Số Tháng Đầu Tư</span>
              <span style="font-size: 18px; font-weight: 700; color: #0F172A;">${data.monthsLabel}</span>
            </div>
          </div>
          
          <!-- Report Date -->
          <div style="display: flex; flex-direction: column; width: 180px; background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); border-radius: 12px; padding: 16px; color: white; justify-content: center;">
            <span style="font-size: 11px; font-weight: 500; text-transform: uppercase; opacity: 0.9;">Ngày Báo Cáo</span>
            <span style="font-size: 18px; font-weight: 700; margin-top: 4px;">${data.reportDateLabel}</span>
          </div>
          
        </div>
        
      </div>
    `;
  }

  private async persistImage(buffer: Buffer): Promise<void> {
    const tempDir = path.join(process.cwd(), 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    const targetPath = path.join(tempDir, 'latest-report.png');
    await fs.writeFile(targetPath, buffer);
    this.logger.log(`Report image saved to ${targetPath}`);
  }

  private buildCaption(summary: ReportSummary): string {
    const emoji = summary.profitValue >= 0 ? '📈' : '📉';
    return `${emoji} Báo cáo ${summary.fundName} — Giá trị hiện tại: ${this.formatCurrency(
      Math.round(summary.currentValue),
    )} VNĐ (${summary.months} tháng)`;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(
      Math.round(value),
    );
  }

  private formatCertificates(value: number): string {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(
      value,
    );
  }

  private buildReportDateLabel(): string {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date());
  }

  private formatMonthLabel(month: string): string {
    const [, monthValue] = month.split('-');
    return `T${Number(monthValue)}`;
  }

  private buildRangeLabel(reports: MonthlyInvestmentReport[]): string {
    if (!reports.length) {
      return 'Không có dữ liệu';
    }
    const first = reports[0].reportMonth;
    const last = reports[reports.length - 1].reportMonth;
    return `${this.formatMonthYear(first)} - ${this.formatMonthYear(last)}`;
  }

  private formatMonthYear(value: string): string {
    const [year, month] = value.split('-');
    return `${month}/${year}`;
  }
}
