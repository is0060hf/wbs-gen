import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { generatePrintHTML } from '@/app/lib/pdf-template';
import { Project } from '@/app/lib/types';

export async function POST(request: Request) {
  let browser;
  try {
    const project: Project = await request.json();

    if (!project.project_info || !project.wbs) {
      return NextResponse.json(
        { error: 'Invalid project data' },
        { status: 400 }
      );
    }

    const html = generatePrintHTML(project);

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A3',
      landscape: true,
      printBackground: true,
      margin: {
        top: '12mm',
        bottom: '12mm',
        left: '10mm',
        right: '10mm',
      },
    });

    await browser.close();
    browser = undefined;

    const filename = `wbs-${project.project_info.name.replace(/[^a-zA-Z0-9\u3040-\u9fff]/g, '_')}.pdf`;

    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('PDF generation failed:', error);
    return NextResponse.json(
      { error: 'PDF generation failed', details: String(error) },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
