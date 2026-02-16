import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';
import { marked, type Token, type Tokens } from 'marked';

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 12,
    fontFamily: 'Helvetica',
  },
  h1: {
    fontSize: 24,
    marginTop: 20,
    marginBottom: 10,
    fontFamily: 'Helvetica-Bold',
  },
  h2: {
    fontSize: 20,
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'Helvetica-Bold',
  },
  h3: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 6,
    fontFamily: 'Helvetica-Bold',
  },
  h4: {
    fontSize: 14,
    marginTop: 10,
    marginBottom: 5,
    fontFamily: 'Helvetica-Bold',
  },
  h5: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
    fontFamily: 'Helvetica-Bold',
  },
  h6: {
    fontSize: 10,
    marginTop: 6,
    marginBottom: 3,
    fontFamily: 'Helvetica-Bold',
  },
  paragraph: {
    marginBottom: 10,
    lineHeight: 1.5,
  },
  code: {
    fontFamily: 'Courier',
    backgroundColor: '#f5f5f5',
    padding: 10,
    marginBottom: 10,
    fontSize: 10,
  },
  inlineCode: {
    fontFamily: 'Courier',
    backgroundColor: '#f9f2f4',
    color: '#c7254e',
    fontSize: 11,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: '#cccccc',
    backgroundColor: '#f9f9f9',
    padding: 10,
    marginBottom: 10,
    fontFamily: 'Helvetica-Oblique',
    color: '#666666',
  },
  list: {
    marginBottom: 10,
  },
  listItem: {
    marginBottom: 5,
    flexDirection: 'row',
  },
  listBullet: {
    width: 20,
  },
  listContent: {
    flex: 1,
  },
  link: {
    color: '#0066cc',
    textDecoration: 'underline',
  },
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    marginVertical: 10,
  },
  table: {
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
  },
  tableHeader: {
    fontFamily: 'Helvetica-Bold',
    backgroundColor: '#f5f5f5',
  },
  tableCell: {
    flex: 1,
    padding: 5,
    fontSize: 10,
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
  italic: {
    fontFamily: 'Helvetica-Oblique',
  },
  boldItalic: {
    fontFamily: 'Helvetica-BoldOblique',
  },
  strikethrough: {
    textDecoration: 'line-through',
  },
});

interface MarkdownPDFProps {
  markdown: string;
}

// Helper to render inline tokens
function renderInlineTokens(tokens: Token[]): React.ReactNode[] {
  return tokens.map((token, index) => {
    switch (token.type) {
      case 'text': {
        const t = token as Tokens.Text;
        if (t.tokens && t.tokens.length > 0) {
          return <Text key={index}>{renderInlineTokens(t.tokens)}</Text>;
        }
        return <Text key={index}>{t.text}</Text>;
      }
      case 'strong': {
        const t = token as Tokens.Strong;
        return (
          <Text key={index} style={styles.bold}>
            {renderInlineTokens(t.tokens)}
          </Text>
        );
      }
      case 'em': {
        const t = token as Tokens.Em;
        return (
          <Text key={index} style={styles.italic}>
            {renderInlineTokens(t.tokens)}
          </Text>
        );
      }
      case 'codespan': {
        const t = token as Tokens.Codespan;
        return (
          <Text key={index} style={styles.inlineCode}>
            {t.text}
          </Text>
        );
      }
      case 'link': {
        const t = token as Tokens.Link;
        return (
          <Link key={index} src={t.href} style={styles.link}>
            {t.text}
          </Link>
        );
      }
      case 'del': {
        const t = token as Tokens.Del;
        return (
          <Text key={index} style={styles.strikethrough}>
            {t.text}
          </Text>
        );
      }
      default:
        return null;
    }
  });
}

export function MarkdownPDF({ markdown }: MarkdownPDFProps) {
  const tokens = marked.lexer(markdown);

  const renderToken = (token: Token, index: number): React.ReactNode => {
    switch (token.type) {
      case 'heading': {
        const t = token as Tokens.Heading;
        const style = styles[`h${t.depth}` as keyof typeof styles];
        return (
          <Text key={index} style={style}>
            {t.text}
          </Text>
        );
      }
      case 'paragraph': {
        const t = token as Tokens.Paragraph;
        return (
          <Text key={index} style={styles.paragraph}>
            {t.tokens ? renderInlineTokens(t.tokens) : t.text}
          </Text>
        );
      }
      case 'code': {
        const t = token as Tokens.Code;
        return (
          <Text key={index} style={styles.code}>
            {t.text}
          </Text>
        );
      }
      case 'blockquote': {
        const t = token as Tokens.Blockquote;
        return (
          <View key={index} style={styles.blockquote}>
            <Text>{t.text}</Text>
          </View>
        );
      }
      case 'list': {
        const t = token as Tokens.List;
        return (
          <View key={index} style={styles.list}>
            {t.items.map((item, i) => (
              <View key={i} style={styles.listItem}>
                <Text style={styles.listBullet}>
                  {t.ordered ? `${i + 1}.` : '•'}
                </Text>
                <View style={styles.listContent}>
                  {item.tokens?.map((subToken, j) => {
                    if (subToken.type === 'text') {
                      const st = subToken as Tokens.Text;
                      return (
                        <Text key={j}>
                          {st.tokens ? renderInlineTokens(st.tokens) : st.text}
                        </Text>
                      );
                    } else if (subToken.type === 'paragraph') {
                      const st = subToken as Tokens.Paragraph;
                      return (
                        <Text key={j}>
                          {st.tokens ? renderInlineTokens(st.tokens) : st.text}
                        </Text>
                      );
                    }
                    return null;
                  })}
                </View>
              </View>
            ))}
          </View>
        );
      }
      case 'hr': {
        return <View key={index} style={styles.hr} />;
      }
      case 'table': {
        const t = token as Tokens.Table;
        return (
          <View key={index} style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              {t.header.map((cell, i) => (
                <Text key={i} style={styles.tableCell}>
                  {cell.text}
                </Text>
              ))}
            </View>
            {t.rows.map((row, i) => (
              <View key={i} style={styles.tableRow}>
                {row.map((cell, j) => (
                  <Text key={j} style={styles.tableCell}>
                    {cell.text}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        );
      }
      case 'space':
        return null;
      default:
        return null;
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {tokens.map((token, index) => renderToken(token, index))}
      </Page>
    </Document>
  );
}

