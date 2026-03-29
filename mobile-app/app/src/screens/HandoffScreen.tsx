import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { parseEntries, formatDate, countHandoffBlocks } from '../handoff-parse';

interface Props {
  serverUrl: string | null;
}

interface IntentFile {
  name: string;
  content: string;
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
    return sum + countHandoffBlocks(c);
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
          const count = countHandoffBlocks(fileContent);
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
