'use client';

import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Stack, Paper, Divider, Alert, LinearProgress, List, ListItem, ListItemText } from '@mui/material';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { createWorker } from 'tesseract.js';
import { saveAs } from 'file-saver';
import { useAuthContext } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

type ConvertedFile = { name: string; url: string; blob: Blob };

interface CVSections {
  candidateInfo: string[];
  skills: string[];
  education: string[];
  experience: string[];
  other: string[];
}

export default function CvConverterPage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [converted, setConverted] = useState<ConvertedFile[]>([]);

  useEffect(() => {
    if (user) {
      const email = user.email || "";
      const isAuthorized = email.toLowerCase().startsWith("ramonoem@") || email.toLowerCase() === "ramonoemedu@gmail.com";
      if (!isAuthorized) {
        router.push('/');
      }
    }
  }, [user, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setConverted([]);
    }
  };

  /**
   * Cleans OCR text by removing bullets, special chars, and leading noise
   */
  const cleanOCRLine = (text: string): string => {
    return text
      // 1. Remove common bullet symbols and special markers at the start
      .replace(/^[●○◦•⦿▪︎■□❑❒❖✦✧★☆*+.\-–—_0-9\s|]+/, '')
      // 2. Remove internal weird OCR artifacts (like single stray chars or symbols)
      .replace(/[●○◦•⦿▪︎■□❑❒❖✦✧★☆*+–—_|_]/g, ' ')
      // 3. Clean up multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
  };

  const categorizeLines = (lines: string[]): CVSections => {
    const sections: CVSections = {
      candidateInfo: [],
      skills: [],
      education: [],
      experience: [],
      other: []
    };

    let currentSection: keyof CVSections = 'candidateInfo';

    const sectionKeywords = {
      skills: /SKILLS|EXPERTISE|STRENGTHS|CORE COMPETENCIES|LANGUAGE|CODING/i,
      education: /EDUCATION|ACADEMIC|QUALIFICATIONS|UNIVERSITY|COLLEGE/i,
      experience: /EXPERIENCE|WORK HISTORY|PROFESSIONAL BACKGROUND|EMPLOYMENT|PRESENT|SUPERVISOR/i
    };

    lines.forEach((line, index) => {
      const cleaned = cleanOCRLine(line);
      if (!cleaned || cleaned.length < 2) return;

      // Detect section changes using original line to avoid missing headers that look like bullets
      if (sectionKeywords.skills.test(line)) {
        currentSection = 'skills';
        if (cleaned.length > 20) sections.skills.push(cleaned); // Keep text if it's more than just the header
        return;
      }
      if (sectionKeywords.education.test(line)) {
        currentSection = 'education';
        if (cleaned.length > 20) sections.education.push(cleaned);
        return;
      }
      if (sectionKeywords.experience.test(line)) {
        currentSection = 'experience';
        if (cleaned.length > 20) sections.experience.push(cleaned);
        return;
      }

      // First few lines are likely candidate info (Name, Email, etc.)
      if (index < 8 && currentSection === 'candidateInfo') {
        sections.candidateInfo.push(cleaned);
      } else {
        sections[currentSection].push(cleaned);
      }
    });

    return sections;
  };

  const handleConvert = async () => {
    if (!file) return;
    try {
      setExtracting(true);
      setError(null);
      setStatus('Starting OCR engine...');

      const worker = await createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setStatus(`Processing: ${Math.floor(m.progress * 100)}%`);
          }
        }
      });

      setStatus('Reading image content...');
      const result = await worker.recognize(file);
      const { text } = result.data;
      
      const rawLines = (result.data.lines || text.split('\n'))
        .map((l: any) => (typeof l === 'string' ? l : l.text))
        .filter((t: string) => t.trim().length > 0);

      await worker.terminate();

      if (rawLines.length === 0) {
        throw new Error('No text detected. Please ensure the image is clear.');
      }

      setStatus('Cleaning and Organizing...');
      const sections = categorizeLines(rawLines);

      setStatus('Creating modern document...');

      const createHeader = (title: string, color = "006BFF") => new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
        border: { bottom: { color: color, space: 1, style: BorderStyle.SINGLE, size: 12 } },
        children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 28, font: "Satoshi", color: color })],
      });

      const createBullet = (text: string) => new Paragraph({
        text: text,
        bullet: { level: 0 },
        spacing: { before: 120 },
      });

      const doc = new Document({
        styles: {
          default: {
            document: {
              run: { font: "Calibri", size: 22, color: "333333" }
            }
          }
        },
        sections: [{
          properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
          children: [
            // Header: Name and Contact
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
              children: [
                new TextRun({ 
                  text: sections.candidateInfo[0] || "CURRICULUM VITAE", 
                  bold: true, size: 48, font: "Arial Black", color: "111928" 
                })
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 500 },
              children: [
                new TextRun({ 
                  text: sections.candidateInfo.slice(1).join(" | "), 
                  size: 18, color: "666666" 
                })
              ],
            }),

            // Experience Section
            ...(sections.experience.length > 0 ? [
              createHeader("Professional Experience", "006BFF"),
              ...sections.experience.map(t => new Paragraph({ 
                text: t, 
                spacing: { before: 120 },
                // If the line looks like a responsibility, bullet it
                bullet: t.length > 40 ? { level: 0 } : undefined 
              }))
            ] : []),

            // Education Section
            ...(sections.education.length > 0 ? [
              createHeader("Education", "7C3AED"),
              ...sections.education.map(t => new Paragraph({ text: t, spacing: { before: 120 } }))
            ] : []),

            // Skills Section
            ...(sections.skills.length > 0 ? [
              createHeader("Skills & Language", "06B6D4"),
              ...sections.skills.map(t => createBullet(t))
            ] : []),

            // Other
            ...(sections.other.length > 0 ? [
              createHeader("Additional Info", "475569"),
              ...sections.other.map(t => new Paragraph({ text: t, spacing: { before: 120 } }))
            ] : [])
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const fileName = `${file.name.replace(/\.[^/.]+$/, "")}_Cleaned_CV.docx`;
      const url = URL.createObjectURL(blob);

      setConverted(prev => [{ name: fileName, url, blob }, ...prev]);
      saveAs(blob, fileName);
      setStatus('Successfully Converted!');
    } catch (err) {
      console.error("Conversion failed:", err);
      setError(err instanceof Error ? err.message : 'Failed to process text.');
    } finally {
      setExtracting(false);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
      <Paper elevation={0} sx={{ p: 5, borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Box mb={4}>
          <Typography variant="h4" sx={{ fontWeight: 900, mb: 1, letterSpacing: '-0.02em' }}>Modern CV Designer</Typography>
          <Typography variant="body1" color="textSecondary">
            Convert image-based CVs into clean, structured Word documents. Automatically removes bullets and noise.
          </Typography>
        </Box>

        <Stack direction="column" spacing={3}>
          <Box 
            sx={{ 
              p: 4, 
              border: '2px dashed #e2e8f0', 
              borderRadius: '16px', 
              textAlign: 'center',
              bgcolor: '#F8FAFC',
              transition: 'all 0.2s',
              '&:hover': { borderColor: '#006BFF', bgcolor: '#F0F7FF' }
            }}
          >
            <input 
              id="cv-upload"
              hidden 
              type="file" 
              accept="image/png, image/jpeg, image/jpg" 
              onChange={handleFileChange} 
            />
            <label htmlFor="cv-upload" style={{ cursor: 'pointer' }}>
              <Typography variant="h6" color="primary" fontWeight={700}>
                {file ? file.name : "Select CV Image"}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                PNG or JPG (Max 10MB)
              </Typography>
            </label>
          </Box>

          <Button
            variant="contained"
            onClick={handleConvert}
            disabled={!file || extracting}
            fullWidth
            sx={{ py: 2, borderRadius: '12px', fontWeight: 800, fontSize: '1rem' }}
          >
            {extracting ? "Cleaning & Exporting..." : "Generate Structured Word CV"}
          </Button>
        </Stack>

        {extracting && (
          <Box sx={{ mt: 4 }}>
            <LinearProgress sx={{ height: 8, borderRadius: 4 }} />
            <Typography variant="body2" sx={{ mt: 2, fontWeight: 600, textAlign: 'center', color: '#006BFF' }}>
              {status}
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 4, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        {converted.length > 0 && (
          <Box sx={{ mt: 5 }}>
            <Divider sx={{ mb: 3 }} />
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 800 }}>Converted Files</Typography>
            <List>
              {converted.map((c, i) => (
                <ListItem 
                  key={i} 
                  sx={{ border: '1px solid #e2e8f0', mb: 2, borderRadius: '12px', bgcolor: 'white' }} 
                  secondaryAction={
                    <Button variant="contained" color="success" onClick={() => saveAs(c.blob, c.name)} sx={{ fontWeight: 700 }}>
                      Download
                    </Button>
                  }
                >
                  <ListItemText primary={c.name} primaryTypographyProps={{ fontWeight: 700 }} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Paper>
    </Box>
  );
}