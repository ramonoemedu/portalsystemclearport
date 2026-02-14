'use client';

import React, { useState } from 'react';
import {
  Container,
  Paper,
  Box,
  Button,
  Typography,
  LinearProgress,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { generateWordFromHTML } from '@/utils/wordGenerator';
import { generateMarkdownFromHTML, downloadMarkdown, generateMarkdownFromProfile } from '@/utils/markdownGenerator';
import { parseHTMLToProfile } from '@/utils/profileParser';
import ProfileDisplay from '../Profile/ProfileDisplay';
import { ProfileData } from '@/types';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { saveAs } from 'file-saver';

// Set up the worker for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface ConversionResult {
  html: string;
  fileName: string;
  pageCount: number;
  profileData?: ProfileData;
}

const PdfToMarkdownConverter: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    } else {
      setError('Please select a valid PDF file');
      setFile(null);
    }
  };

  const extractTextFromPDF = async (file: File): Promise<ConversionResult> => {
    const fileReader = new FileReader();

    return new Promise((resolve, reject) => {
      fileReader.onload = async () => {
        try {
          const pdf = await pdfjsLib.getDocument(
            fileReader.result as ArrayBuffer
          ).promise;
          let fullHtml = '';
          const pageCount = pdf.numPages;

          const escapeHtml = (str: string) =>
            str
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');

          for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
            setProgress(Math.floor((pageNum / pageCount) * 50));

            const page = await pdf.getPage(pageNum);

            // Try to extract text first
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');

            if (pageText.trim().length > 0) {
              fullHtml += `<h1>Page ${pageNum}</h1><p>${escapeHtml(pageText)}</p>`;
            } else {
              // If no text, use OCR
              const viewport = page.getViewport({ scale: 2 });
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');
              canvas.width = viewport.width;
              canvas.height = viewport.height;

              if (context) {
                await page.render({
                  canvasContext: context,
                  viewport: viewport,
                  canvas: canvas as any,
                }).promise;

                setProgress(50 + Math.floor((pageNum / pageCount) * 50));

                const { data } = await Tesseract.recognize(
                  canvas,
                  'eng',
                  {
                    logger: (m) => console.log('OCR Progress:', m),
                  }
                );

                fullHtml += `<h1>Page ${pageNum}</h1><p>${escapeHtml(data.text)}</p>`;
              }
            }
          }

          resolve({
            html: fullHtml,
            fileName: file.name.replace('.pdf', ''),
            pageCount: pageCount,
            profileData: parseHTMLToProfile(fullHtml),
          });
        } catch (err) {
          reject(err);
        }
      };

      fileReader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      fileReader.readAsArrayBuffer(file);
    });
  };

  const handleConvert = async () => {
    if (!file) {
      setError('Please select a PDF file first');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      const conversionResult = await extractTextFromPDF(file);
      setProgress(100);
      setResult(conversionResult);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to convert PDF'
      );
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const downloadHTML = () => {
    if (!result) return;

    const element = document.createElement('a');
    const fileBlob = new Blob([result.html], { type: 'text/html' });
    element.href = URL.createObjectURL(fileBlob);
    element.download = `${result.fileName}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
  };

  const handleDownloadMarkdown = () => {
    if (!result) return;

    try {
      let markdown = '';
      if (result.profileData) {
        markdown = generateMarkdownFromProfile(result.profileData);
      } else {
        markdown = generateMarkdownFromHTML(result.html);
      }
      downloadMarkdown(markdown, result.fileName);
    } catch (err) {
      console.error(err);
      setError('Failed to create Markdown file');
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
  };

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid #e2e8f0' }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3, fontWeight: 800 }}>
          PDF to Markdown Converter
        </Typography>

        {!result ? (
          <Box sx={{ mb: 3 }}>
            <input
              accept="application/pdf"
              style={{ display: 'none' }}
              id="pdf-file-input"
              type="file"
              onChange={handleFileChange}
            />
            <label htmlFor="pdf-file-input" style={{ width: '100%' }}>
              <Button
                variant="contained"
                component="span"
                startIcon={<CloudUploadIcon />}
                fullWidth
                size="large"
                sx={{ mb: 2, py: 2 }}
              >
                Choose PDF File
              </Button>
            </label>

            {file && (
              <Box sx={{ mb: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Typography variant="body2" color="textSecondary">
                  Selected file:
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {file.name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                </Typography>
              </Box>
            )}

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

            <Button
              variant="contained"
              color="primary"
              onClick={handleConvert}
              disabled={!file || loading}
              fullWidth
              size="large"
              sx={{ mb: 2, py: 1.5 }}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                  Converting...
                </>
              ) : (
                'Convert PDF'
              )}
            </Button>

            {loading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
                <Typography variant="caption" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                  Progress: {progress}%
                </Typography>
              </Box>
            )}
          </Box>
        ) : (
          <Box>
            <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    PDF converted successfully!
                  </Typography>
                  <Typography variant="caption">
                    ✓ Profile parsed and ready to view
                  </Typography>
                </Box>
              </Box>
            </Alert>

            {result.profileData && (
              <ProfileDisplay
                data={result.profileData}
                onDownloadMarkdown={handleDownloadMarkdown}
                onDownloadHTML={downloadHTML}
              />
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<DeleteIcon />}
                onClick={handleReset}
                fullWidth
                sx={{ py: 1.5 }}
              >
                Convert Another PDF
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default PdfToMarkdownConverter;
