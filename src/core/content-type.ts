import type { ParsedDocumentMeta } from './markdown.js';

export type ContentType = 'page' | 'post';

export interface DirectoryShape {
  hasSkillIndex: boolean;
  hasChildDirectories: boolean;
  hasExtraMarkdownFiles: boolean;
  hasAssetFiles: boolean;
}

export function resolveContentType(meta: ParsedDocumentMeta): ContentType | undefined {
  return meta.type === 'page' || meta.type === 'post' ? meta.type : undefined;
}

export function inferDirectoryContentType(
  meta: ParsedDocumentMeta,
  shape: DirectoryShape,
): ContentType {
  const explicitType = resolveContentType(meta);
  if (explicitType) {
    return explicitType;
  }

  if (typeof meta.date === 'string' && meta.date !== '') {
    return 'post';
  }

  if (shape.hasSkillIndex) {
    return 'post';
  }

  if (shape.hasChildDirectories || shape.hasExtraMarkdownFiles) {
    return 'page';
  }

  if (shape.hasAssetFiles) {
    return 'post';
  }

  return 'page';
}
