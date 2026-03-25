import MsgReaderImport from 'msgreader';

const MsgReader = MsgReaderImport?.default ?? MsgReaderImport;

const MIME_ENCODED_WORD_REGEX = /=\?([^?]+)\?([bqBQ])\?([^?]+)\?=/g;

const escapeHtml = (value = '') =>
  value
    .toString()
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const formatMultilineHtml = (value = '') =>
  escapeHtml(value)
    .replaceAll('\r\n', '<br />')
    .replaceAll('\r', '<br />')
    .replaceAll('\n', '<br />');

const buildInfoRow = (label, value) => {
  if (!value) return '';
  return `
    <div style="padding:10px 14px;border:1px solid #e5e7eb;border-radius:10px;background:#ffffff;">
      <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(label)}</div>
      <div style="margin-top:4px;font-size:14px;color:#0f172a;word-break:break-word;">${formatMultilineHtml(value)}</div>
    </div>
  `;
};

const formatRecipientList = (recipients = []) => {
  const normalized = recipients
    .map((recipient) => {
      const name = recipient?.name?.trim();
      const email = recipient?.email?.trim();
      if (name && email) return `${name} <${email}>`;
      return name || email || '';
    })
    .filter(Boolean);

  return normalized.join(', ');
};

const decodeMimeEncodedWords = (value = '') => value.replace(MIME_ENCODED_WORD_REGEX, (_match, charset, encoding, encodedText) => {
  try {
    if (encoding.toUpperCase() === 'B') {
      const binary = atob(encodedText);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new TextDecoder(charset, { fatal: false }).decode(bytes);
    }

    const normalized = encodedText
      .replaceAll('_', ' ')
      .replace(/=([0-9A-F]{2})/gi, (_hex, code) => String.fromCharCode(parseInt(code, 16)));
    const bytes = Uint8Array.from(normalized, (char) => char.charCodeAt(0));
    return new TextDecoder(charset, { fatal: false }).decode(bytes);
  } catch {
    return encodedText;
  }
});

const decodeQuotedPrintable = (value = '') => {
  const normalized = value
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-F]{2})/gi, (_match, hex) => String.fromCharCode(parseInt(hex, 16)));

  const bytes = Uint8Array.from(normalized, (char) => char.charCodeAt(0));
  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return normalized;
  }
};

const normalizeMimeHeaderValue = (value = '') => decodeMimeEncodedWords(value.trim());

const parseRawHeaders = (headerBlock = '') => {
  const unfolded = headerBlock.replace(/\r?\n[\t ]+/g, ' ');
  return unfolded
    .split(/\r?\n/)
    .reduce((headers, line) => {
      const separatorIndex = line.indexOf(':');
      if (separatorIndex === -1) return headers;
      const key = line.slice(0, separatorIndex).trim().toLowerCase();
      const value = normalizeMimeHeaderValue(line.slice(separatorIndex + 1));
      headers[key] = value;
      return headers;
    }, {});
};

const parseEmailAddressList = (value = '') => {
  if (!value) return [];

  return value
    .split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const angleMatch = entry.match(/^(.*?)(?:<([^>]+)>)$/);
      if (angleMatch) {
        return {
          name: angleMatch[1].replace(/^"|"$/g, '').trim(),
          email: angleMatch[2].trim()
        };
      }

      return entry.includes('@')
        ? { email: entry.replace(/^"|"$/g, '').trim() }
        : { name: entry.replace(/^"|"$/g, '').trim() };
    });
};

const extractMimeBoundary = (contentType = '') => {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  return match?.[1] || match?.[2] || null;
};

const extractCharset = (contentType = '') => {
  const match = contentType.match(/charset=(?:"([^"]+)"|([^;]+))/i);
  return match?.[1] || match?.[2] || 'utf-8';
};

const decodeBodyByEncoding = (content = '', transferEncoding = '', charset = 'utf-8') => {
  const encoding = transferEncoding.toLowerCase();

  try {
    if (encoding.includes('base64')) {
      const binary = atob(content.replace(/\s+/g, ''));
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new TextDecoder(charset, { fatal: false }).decode(bytes);
    }

    if (encoding.includes('quoted-printable')) {
      return decodeQuotedPrintable(content);
    }

    const bytes = Uint8Array.from(content, (char) => char.charCodeAt(0));
    return new TextDecoder(charset, { fatal: false }).decode(bytes);
  } catch {
    return content;
  }
};

const htmlToPlainText = (html = '') => {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') return html;

  try {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    return parsed.body?.textContent?.trim() || '';
  } catch {
    return html;
  }
};

const splitMimeParts = (body = '', boundary) => {
  if (!boundary) return [];
  const boundaryToken = `--${boundary}`;

  return body
    .split(boundaryToken)
    .map((part) => part.trim())
    .filter((part) => part && part !== '--');
};

const parseMimePart = (rawPart = '') => {
  const [rawHeaders = '', ...contentParts] = rawPart.split(/\r?\n\r?\n/);
  const headers = parseRawHeaders(rawHeaders);
  const content = contentParts.join('\n\n').trim();
  const contentType = headers['content-type'] || 'text/plain';
  const transferEncoding = headers['content-transfer-encoding'] || '';
  const contentDisposition = headers['content-disposition'] || '';
  const charset = extractCharset(contentType);
  const filenameMatch = (contentDisposition || contentType).match(/filename\*?=(?:UTF-8''|"?)([^";]+)/i);
  const filename = filenameMatch ? decodeMimeEncodedWords(filenameMatch[1].replace(/^"|"$/g, '')) : '';

  if (/multipart\//i.test(contentType)) {
    const boundary = extractMimeBoundary(contentType);
    const nestedParts = splitMimeParts(content, boundary).map(parseMimePart);
    return {
      headers,
      contentType,
      parts: nestedParts,
      filename,
      isAttachment: /attachment/i.test(contentDisposition)
    };
  }

  const decodedContent = decodeBodyByEncoding(content, transferEncoding, charset);

  return {
    headers,
    contentType,
    content: decodedContent,
    filename,
    isAttachment: /attachment/i.test(contentDisposition)
  };
};

const flattenMimeParts = (part) => {
  if (!part) return [];
  if (!part.parts?.length) return [part];
  return part.parts.flatMap(flattenMimeParts);
};

const parseEmlFileData = (rawEmail = '') => {
  const [rawHeaders = '', ...bodyParts] = rawEmail.split(/\r?\n\r?\n/);
  const headers = parseRawHeaders(rawHeaders);
  const body = bodyParts.join('\n\n');
  const rootContentType = headers['content-type'] || 'text/plain; charset=utf-8';
  const boundary = extractMimeBoundary(rootContentType);

  const topLevelParts = boundary
    ? splitMimeParts(body, boundary).map(parseMimePart)
    : [parseMimePart(`${rawHeaders}\n\n${body}`)];

  const flatParts = topLevelParts.flatMap(flattenMimeParts);
  const textPart = flatParts.find((part) => /^text\/plain/i.test(part.contentType) && !part.isAttachment);
  const htmlPart = flatParts.find((part) => /^text\/html/i.test(part.contentType) && !part.isAttachment);
  const attachmentNames = flatParts
    .filter((part) => part.isAttachment && part.filename)
    .map((part) => part.filename);

  const bodyText = textPart?.content?.trim() || htmlToPlainText(htmlPart?.content || '').trim() || 'Este correo no contiene cuerpo de texto legible.';

  return {
    subject: headers.subject || '',
    senderName: parseEmailAddressList(headers.from || '')[0]?.name || '',
    senderEmail: parseEmailAddressList(headers.from || '')[0]?.email || '',
    recipients: parseEmailAddressList(headers.to || ''),
    cc: parseEmailAddressList(headers.cc || ''),
    date: headers.date || '',
    attachments: attachmentNames,
    body: bodyText
  };
};

const buildMsgPreviewHtml = (doc, fileData) => {
  const sender = [fileData?.senderName, fileData?.senderEmail ? `<${fileData.senderEmail}>` : '']
    .filter(Boolean)
    .join(' ')
    .trim();
  const recipients = formatRecipientList(fileData?.recipients || []);
  const attachments = (fileData?.attachments || [])
    .map((attachment) => attachment?.fileName || attachment?.fileNameShort || '')
    .filter(Boolean);
  const body = fileData?.body?.trim() || 'Este mensaje no contiene cuerpo de texto legible.';

  return `
    <div style="text-align:left;display:flex;flex-direction:column;gap:12px;max-height:60vh;overflow:auto;padding-right:4px;">
      <div style="padding:14px 16px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;">
        <div style="font-size:12px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.04em;">Archivo MSG</div>
        <div style="margin-top:6px;font-size:15px;font-weight:600;color:#0f172a;word-break:break-word;">${escapeHtml(fileData?.subject || doc?.nombre || 'Correo de Outlook')}</div>
      </div>
      ${buildInfoRow('Remitente', sender)}
      ${buildInfoRow('Destinatarios', recipients)}
      ${attachments.length > 0 ? buildInfoRow('Adjuntos', attachments.join(', ')) : ''}
      <div style="padding:14px 16px;border-radius:12px;border:1px solid #e5e7eb;background:#f8fafc;">
        <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Contenido</div>
        <div style="margin-top:8px;font-size:14px;line-height:1.6;color:#0f172a;white-space:normal;word-break:break-word;">${formatMultilineHtml(body)}</div>
      </div>
    </div>
  `;
};

const buildEmlPreviewHtml = (doc, fileData) => {
  const sender = [fileData?.senderName, fileData?.senderEmail ? `<${fileData.senderEmail}>` : '']
    .filter(Boolean)
    .join(' ')
    .trim();
  const recipients = formatRecipientList(fileData?.recipients || []);
  const cc = formatRecipientList(fileData?.cc || []);
  const attachments = (fileData?.attachments || []).filter(Boolean);
  const body = fileData?.body?.trim() || 'Este correo no contiene cuerpo de texto legible.';

  return `
    <div style="text-align:left;display:flex;flex-direction:column;gap:12px;max-height:60vh;overflow:auto;padding-right:4px;">
      <div style="padding:14px 16px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;">
        <div style="font-size:12px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.04em;">Archivo EML</div>
        <div style="margin-top:6px;font-size:15px;font-weight:600;color:#0f172a;word-break:break-word;">${escapeHtml(fileData?.subject || doc?.nombre || 'Correo electrónico')}</div>
      </div>
      ${buildInfoRow('Remitente', sender)}
      ${buildInfoRow('Destinatarios', recipients)}
      ${buildInfoRow('CC', cc)}
      ${buildInfoRow('Fecha', fileData?.date || '')}
      ${attachments.length > 0 ? buildInfoRow('Adjuntos', attachments.join(', ')) : ''}
      <div style="padding:14px 16px;border-radius:12px;border:1px solid #e5e7eb;background:#f8fafc;">
        <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Contenido</div>
        <div style="margin-top:8px;font-size:14px;line-height:1.6;color:#0f172a;white-space:normal;word-break:break-word;">${formatMultilineHtml(body)}</div>
      </div>
    </div>
  `;
};

const isMsgFile = (fileName = '', fileType = '') => {
  const lowerName = fileName.toLowerCase();
  const lowerType = fileType.toLowerCase();
  return lowerName.endsWith('.msg') || lowerType.includes('application/vnd.ms-outlook');
};

const isEmlFile = (fileName = '', fileType = '') => {
  const lowerName = fileName.toLowerCase();
  const lowerType = fileType.toLowerCase();
  return lowerName.endsWith('.eml') || lowerType.includes('message/rfc822');
};

const getViewerWindow = () => globalThis.window || globalThis;

export const triggerBrowserDownload = async (downloadUrl, fileName = 'documento') => {
  const viewerWindow = getViewerWindow();
  const downloadFileName = fileName || 'documento';

  try {
    if (typeof fetch === 'function' && viewerWindow.URL?.createObjectURL) {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new TypeError('No se pudo descargar el archivo.');
      }

      const blob = await response.blob();
      const objectUrl = viewerWindow.URL.createObjectURL(blob);
      const link = viewerWindow.document.createElement('a');
      link.href = objectUrl;
      link.download = downloadFileName;
      link.style.display = 'none';
      viewerWindow.document.body.appendChild(link);
      link.click();
      link.remove();
      viewerWindow.URL.revokeObjectURL?.(objectUrl);
      return;
    }
  } catch {
  }

  const fallbackLink = viewerWindow.document.createElement('a');
  fallbackLink.href = downloadUrl;
  fallbackLink.download = downloadFileName;
  fallbackLink.style.display = 'none';
  viewerWindow.document.body.appendChild(fallbackLink);
  fallbackLink.click();
  fallbackLink.remove();
};

const fetchMsgFileData = async (downloadUrl) => {
  if (typeof fetch !== 'function') {
    throw new Error('La previsualizacion de archivos MSG no esta disponible en este navegador.');
  }

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error('No se pudo cargar el archivo MSG para previsualizarlo.');
  }

  const buffer = await response.arrayBuffer();
  const reader = new MsgReader(buffer);
  const fileData = reader.getFileData();

  if (fileData?.error) {
    throw new Error(fileData.error);
  }

  return fileData;
};

const fetchEmlFileData = async (downloadUrl) => {
  if (typeof fetch !== 'function') {
    throw new Error('La previsualizacion de archivos EML no esta disponible en este navegador.');
  }

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error('No se pudo cargar el archivo EML para previsualizarlo.');
  }

  const buffer = await response.arrayBuffer();
  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  return parseEmlFileData(decoded);
};

export const openDocumentPreview = async ({ doc, getDocumentPreviewUrl, getDocumentPreviewContent, getDocumentDownloadUrl, Swal }) => {
  const viewerWindow = getViewerWindow();
  const fileName = doc?.nombre || '';
  const fileType = doc?.tipo || '';
  const lowerName = fileName.toLowerCase();
  const isPdf = fileType.includes('pdf') || lowerName.endsWith('.pdf');
  const isImage = fileType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(lowerName);
  const isOffice = /\.(docx?|xlsx?|pptx?)$/.test(lowerName) || /(word|excel|powerpoint)/i.test(fileType);
  const isMsg = isMsgFile(fileName, fileType);
  const isEml = isEmlFile(fileName, fileType);
  const downloadUrl = await getDocumentDownloadUrl(doc.id);

  if (isMsg) {
    const fileData = getDocumentPreviewContent
      ? await getDocumentPreviewContent(doc.id)
      : await fetchMsgFileData(downloadUrl);
    const result = await Swal.fire({
      title: doc?.nombre ? `Previsualizar ${doc.nombre}` : 'Previsualizar documento',
      html: buildMsgPreviewHtml(doc, fileData),
      showCancelButton: true,
      confirmButtonText: 'Descargar',
      cancelButtonText: 'Cerrar',
      confirmButtonColor: '#1e40af',
      width: 900
    });

    if (result.isConfirmed) {
      await triggerBrowserDownload(downloadUrl, fileName);
    }
    return;
  }

  if (isEml) {
    const fileData = getDocumentPreviewContent
      ? await getDocumentPreviewContent(doc.id)
      : await fetchEmlFileData(downloadUrl);
    const result = await Swal.fire({
      title: doc?.nombre ? `Previsualizar ${doc.nombre}` : 'Previsualizar documento',
      html: buildEmlPreviewHtml(doc, fileData),
      showCancelButton: true,
      confirmButtonText: 'Descargar',
      cancelButtonText: 'Cerrar',
      confirmButtonColor: '#1e40af',
      width: 900
    });

    if (result.isConfirmed) {
      await triggerBrowserDownload(downloadUrl, fileName);
    }
    return;
  }

  const previewUrl = await getDocumentPreviewUrl(doc.id);
  const previewSrc = isOffice
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewUrl)}&zoom=50`
    : previewUrl;
  const canEmbed = isPdf || isImage || isOffice;
  const isMobile = viewerWindow.matchMedia?.('(max-width: 1023px)').matches;

  if (isMobile) {
    const mobileResult = await Swal.fire({
      title: doc?.nombre ? `Previsualizar ${doc.nombre}` : 'Previsualizar documento',
      text: 'En movil la previsualizacion se abre en una nueva pestaña para poder usar los controles.',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Abrir vista',
      denyButtonText: 'Descargar',
      cancelButtonText: 'Cerrar',
      confirmButtonColor: '#1e40af'
    });

    if (mobileResult.isConfirmed) {
      viewerWindow.open(previewSrc, '_blank', 'noopener');
    } else if (mobileResult.isDenied) {
      await triggerBrowserDownload(downloadUrl, fileName);
    }
    return;
  }

  const result = await Swal.fire({
    title: doc?.nombre ? `Previsualizar ${doc.nombre}` : 'Previsualizar documento',
    html: canEmbed
      ? isImage
        ? `
          <div style="width:100%;height:60vh;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;background:#0f172a;display:flex;align-items:center;justify-content:center;padding:12px;">
            <img src="${previewSrc}" alt="${escapeHtml(fileName || 'Previsualizacion')}" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;" />
          </div>
          <p style="margin-top:10px;font-size:14px;color:#6b7280;">Si no puedes ver la previsualizacion, usa el boton Descargar.</p>
        `
        : `
          <div style="width:100%;height:60vh;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
            <iframe src="${previewSrc}" title="Previsualizacion" style="width:100%;height:100%;border:0;"></iframe>
          </div>
          <p style="margin-top:10px;font-size:14px;color:#6b7280;">Si no puedes ver la previsualizacion, usa el boton Descargar.</p>
        `
      : `
        <div style="padding:18px;border-radius:10px;border:1px solid #e5e7eb;background:#f8fafc;">
          <p style="font-size:14px;color:#334155;">Este tipo de archivo no admite previsualizacion en el navegador.</p>
        </div>
        <p style="margin-top:10px;font-size:14px;color:#6b7280;">Usa el boton Descargar para abrirlo.</p>
      `,
    showCancelButton: true,
    confirmButtonText: 'Descargar',
    cancelButtonText: 'Cerrar',
    confirmButtonColor: '#1e40af',
    width: 900
  });

  if (result.isConfirmed) {
    await triggerBrowserDownload(downloadUrl, fileName);
  }
};