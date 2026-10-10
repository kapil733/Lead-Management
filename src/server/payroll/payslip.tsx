import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { formatINR } from "@/lib/money";

export type PayslipData = {
  month: string;
  companyName: string;
  employeeCode: string;
  fullName: string;
  designation?: string | null;
  clientName?: string | null;
  payableDays: number;
  earnedGrossPaise: number;
  pfEmployeePaise: number;
  esicEmployeePaise: number;
  otherEarningsPaise: number;
  otherDeductionsPaise: number;
  netPayPaise: number;
  employerPfPaise: number;
  employerEsicPaise: number;
  components?: {
    label: string;
    earnedPaise: number;
  }[];
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 16, marginBottom: 4, fontWeight: 700 },
  sub: { fontSize: 10, color: "#444", marginBottom: 16 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  section: { marginTop: 14, marginBottom: 4, fontSize: 11, fontWeight: 700 },
  net: { marginTop: 16, fontSize: 12, fontWeight: 700 },
  note: { marginTop: 20, fontSize: 8, color: "#666" },
});

function PayslipDoc({ data }: { data: PayslipData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{data.companyName}</Text>
        <Text style={styles.sub}>
          Payslip · {data.month} · {data.employeeCode} · {data.fullName}
        </Text>
        {data.clientName ? (
          <Text style={styles.sub}>Client: {data.clientName}</Text>
        ) : null}

        <Text style={styles.section}>Attendance</Text>
        <View style={styles.row}>
          <Text>Payable days</Text>
          <Text>{data.payableDays}</Text>
        </View>

        <Text style={styles.section}>Earnings</Text>
        {(data.components ?? []).map((c) => (
          <View key={c.label} style={styles.row}>
            <Text>{c.label}</Text>
            <Text>{formatINR(c.earnedPaise)}</Text>
          </View>
        ))}
        <View style={styles.row}>
          <Text>Other earnings</Text>
          <Text>{formatINR(data.otherEarningsPaise)}</Text>
        </View>
        <View style={styles.row}>
          <Text>Earned gross</Text>
          <Text>{formatINR(data.earnedGrossPaise)}</Text>
        </View>

        <Text style={styles.section}>Deductions</Text>
        <View style={styles.row}>
          <Text>PF (employee)</Text>
          <Text>{formatINR(data.pfEmployeePaise)}</Text>
        </View>
        <View style={styles.row}>
          <Text>ESIC (employee)</Text>
          <Text>{formatINR(data.esicEmployeePaise)}</Text>
        </View>
        <View style={styles.row}>
          <Text>Other deductions</Text>
          <Text>{formatINR(data.otherDeductionsPaise)}</Text>
        </View>

        <Text style={styles.net}>
          Net pay: {formatINR(data.netPayPaise)}
        </Text>

        <Text style={styles.section}>Employer contributions</Text>
        <View style={styles.row}>
          <Text>PF (employer)</Text>
          <Text>{formatINR(data.employerPfPaise)}</Text>
        </View>
        <View style={styles.row}>
          <Text>ESIC (employer)</Text>
          <Text>{formatINR(data.employerEsicPaise)}</Text>
        </View>

        <Text style={styles.note}>
          Computer-generated payslip. Verify statutory rates with your CA /
          EPFO / ESIC notifications.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderPayslipPdf(data: PayslipData): Promise<Buffer> {
  const buf = await renderToBuffer(<PayslipDoc data={data} />);
  return Buffer.from(buf);
}
