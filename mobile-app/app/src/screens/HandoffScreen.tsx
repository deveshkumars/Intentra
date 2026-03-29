import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';

interface Props {
  serverUrl: string | null;
}

interface IntentFile {
  name: string;
  content: string;
}

/** A single parsed entry from a --- separated markdown file */
interface HandoffEntry {
  /** Raw text of this entry block */
  body: string;
  /** Extracted date string (if found) */
  date: string | null;
  /** Extracted author (if found) */
  author: string | null;
  /** First meaningful line after date/author — used as summary */
  summary: string;
}

type DocType = 'HANDOFFS' | 'PROMPTS' | 'PLANS';

const DOC_FILES: Record<DocType, string> = {
  HANDOFFS: 'HANDOFFS.md',
  PROMPTS: 'PROMPTS.md',
  PLANS: 'PLANS.md',
};

const DOC_LABELS: Record<DocType, { title: string; icon: string; description: string }> = {
  HANDOFFS: {
    title: 'Handoffs',
    icon: '🤝',
    description: 'Session state, decisions made, and next actions',
  },
  PROMPTS: {
    title: 'Prompts',
    icon: '💬',
    description: 'Exact prompts given to agents this session',
  },
  PLANS: {
    title: 'Plans',
    icon: '📋',
    description: 'Implementation plans and task breakdowns',
  },
};

const DOC_ORDER: DocType[] = ['HANDOFFS', 'PROMPTS', 'PLANS'];

/** Parse a date like "2026-03-29" or "**2026-03-29 — Author Name**" from the first lines */
function parseEntry(raw: string): HandoffEntry {
  const lines = raw.trim().split('\n');
  let date: string | null = null;
  let author: string | null = null;
  let summaryStart = 0;

  for (let i = 0; i < Math.min(lines.length, 4); i++) {
    const line = lines[i]!.trim();
    // Match patterns like "**2026-03-29 — Gordon Beckler**" or "2026-03-29 — Gordon"
    const dateMatch = line.match(/\*{0,2}(\d{4}-\d{2}-\d{2})\s*[—–-]\s*(.+?)\*{0,2}$/);
    if (dateMatch) {
      date = dateMatch[1]!;
      author = dateMatch[2]!.replace(/\*+$/, '').trim();
      summaryStart = i + 1;
      break;
    }
    // Match plain date
    const plainDate = line.match(/^(\d{4}-\d{2}-\d{2})/);
    if (plainDate) {
      date = plainDate[1]!;
      summaryStart = i + 1;
      break;
    }
  }

  // Find first non-empty, non-header line for summary
  let summary = '';
  for (let i = summaryStart; i < lines.length; i++) {
    const l = lines[i]!.trim();
    if (!l) continue;
    // Skip blockquote markers, headers
    const cleaned = l.replace(/^[>#*\-\s]+/, '').trim();
    if (cleaned.length > 5) {
      summary = cleaned.length > 120 ? cleaned.slice(0, 117) + '…' : cleaned;
      break;
    }
  }

  return { body: raw.trim(), date, author, summary: summary || '(no content)' };
}

/** Split a markdown file into entries separated by \n---\n */
function parseEntries(content: string): HandoffEntry[] {
  const blocks = content.split(/\n---\n/).map(b => b.trim()).filter(Boolean);
  return blocks.map(parseEntry).reverse(); // newest first
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

export function HandoffScreen({ serverUrl }: Props) {
  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeDoc, setActiveDoc] = useState<DocType>('HANDOFFS');
  const [expandedEntries, setExpandedEntries] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!serverUrl) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${serverUrl}/intentra/files`, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json() as { files: IntentFile[] };
      const map: Record<string, string> = {};
      for (const f of data.files) {
        if (f.name === 'HANDOFFS.md' || f.name === 'PROMPTS.md' || f.name === 'PLANS.md') {
          map[f.name] = f.content;
        }
      }
      setFiles(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [serverUrl]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleEntry = (key: string) => {
    setExpandedEntries(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!serverUrl) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Handoffs</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No server connected</Text>
        </View>
      </View>
    );
  }

  const currentFile = DOC_FILES[activeDoc];
  const content = files[currentFile] ?? '';
  const entries = content ? parseEntries(content) : [];
  const meta = DOC_LABELS[activeDoc];
  const totalEntries = DOC_ORDER.reduce((sum, doc) => {
    const c = files[DOC_FILES[doc]] ?? '';
    return sum + (c ? c.split(/\n---\n/).filter(b => b.trim()).length : 0);
  }, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Handoffs</Text>
        <Text style={styles.subtitle}>
          {totalEntries} {totalEntries === 1 ? 'entry' : 'entries'} across {Object.keys(files).length} files
        </Text>
      </View>

      {/* Doc type picker */}
      <View style={styles.pickerRow}>
        {DOC_ORDER.map(doc => {
          const isActive = activeDoc === doc;
          const label = DOC_LABELS[doc];
          const fileContent = files[DOC_FILES[doc]] ?? '';
          const count = fileContent ? fileContent.split(/\n---\n/).filter(b => b.trim()).length : 0;
          return (
            <TouchableOpacity
              key={doc}
              style={[styles.pickerChip, isActive && styles.pickerChipActive]}
              onPress={() => setActiveDoc(doc)}
              activeOpacity={0.7}
            >
              <Text style={styles.pickerIcon}>{label.icon}</Text>
              <Text style={[styles.pickerLabel, isActive && styles.pickerLabelActive]}>
                {label.title}
              </Text>
              {count > 0 && (
                <View style={[styles.pickerBadge, isActive && styles.pickerBadgeActive]}>
                  <Text style={[styles.pickerBadgeText, isActive && styles.pickerBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Description */}
      <Text style={styles.docDescription}>{meta.description}</Text>

      {/* Content */}
      {loading && entries.length === 0 ? (
        <View style={styles.empty}>
          <ActivityIndicator color="#4ade80" />
        </View>
      ) : error ? (
        <View style={styles.empty}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>{meta.icon}</Text>
          <Text style={styles.emptyText}>No {meta.title.toLowerCase()} yet</Text>
          <Text style={styles.emptyHint}>
            Use the /handoff skill to add entries
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchData}
              tintColor="#475569"
            />
          }
        >
          {entries.map((entry, i) => {
            const entryKey = `${activeDoc}-${i}`;
            const isExpanded = expandedEntries[entryKey] ?? (i === 0); // latest expanded by default
            const isLatest = i === 0;

            return (
              <View key={entryKey} style={styles.entryCard}>
                {/* Entry header */}
                <TouchableOpacity
                  style={styles.entryHeader}
                  onPress={() => toggleEntry(entryKey)}
                  activeOpacity={0.7}
                >
                  <View style={styles.entryHeaderLeft}>
                    {isLatest && (
                      <View style={styles.latestBadge}>
                        <Text style={styles.latestBadgeText}>LATEST</Text>
                      </View>
                    )}
                    {entry.date && (
                      <Text style={styles.entryDate}>
                        {formatDate(entry.date)}
                      </Text>
                    )}
                    {entry.author && (
                      <Text style={styles.entryAuthor}>{entry.author}</Text>
                    )}
                  </View>
                  <Text style={styles.chevron}>{isExpanded ? '▼' : '▶'}</Text>
                </TouchableOpacity>

                {/* Summary (collapsed) */}
                {!isExpanded && (
                  <Text style={styles.entrySummary} numberOfLines={2}>
                    {entry.summary}
                  </Text>
                )}

                {/* Full content (expanded) */}
                {isExpanded && (
                  <View style={styles.entryBody}>
                    <Text style={styles.entryContent}>{entry.body}</Text>
                  </View>
                )}
              </View>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
  },
  title: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: '#475569',
    fontSize: 12,
    marginTop: 4,
  },
  pickerRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  pickerChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 4,
  },
  pickerChipActive: {
    backgroundColor: '#312e81',
    borderWidth: 1,
    borderColor: '#818cf8',
  },
  pickerIcon: {
    fontSize: 14,
  },
  pickerLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  pickerLabelActive: {
    color: '#e0e7ff',
  },
  pickerBadge: {
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  pickerBadgeActive: {
    backgroundColor: '#4338ca',
  },
  pickerBadgeText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  pickerBadgeTextActive: {
    color: '#e0e7ff',
  },
  docDescription: {
    color: '#64748b',
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
  },
  scroll: {
    flex: 1,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyText: {
    color: '#475569',
    fontSize: 15,
  },
  emptyHint: {
    color: '#334155',
    fontSize: 12,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
  },
  entryCard: {
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  entryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  latestBadge: {
    backgroundColor: '#4338ca',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  latestBadgeText: {
    color: '#e0e7ff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  entryDate: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  entryAuthor: {
    color: '#64748b',
    fontSize: 12,
  },
  chevron: {
    color: '#475569',
    fontSize: 10,
    marginLeft: 8,
  },
  entrySummary: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  entryBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#334155',
  },
  entryContent: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'monospace',
    paddingTop: 10,
  },
});
