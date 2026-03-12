
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Grievance, User } from '../types';

export const generateGrievanceReport = (grievance: Grievance, student: User | null, staff: User | null) => {
  const doc = new jsPDF() as any;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(79, 70, 229); // Indigo-600
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Grievance Resolution Report', 20, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Report ID: RPT-${grievance.id}`, pageWidth - 60, 20);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 60, 26);

  // Grievance Summary Section
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Case Overview', 20, 55);
  
  const overviewData = [
    ['Case ID', grievance.id],
    ['Title', grievance.title],
    ['Department', grievance.department],
    ['Priority', grievance.severity],
    ['Current Status', grievance.status.toUpperCase()],
    ['Submission Date', new Date(grievance.timestamp).toLocaleDateString()]
  ];

  doc.autoTable({
    startY: 60,
    head: [],
    body: overviewData,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', width: 40 } }
  });

  // Parties Involved
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Involved Parties', 20, doc.lastAutoTable.finalY + 15);

  const partiesData = [
    ['Role', 'Name', 'ID', 'Department'],
    ['Complainant', student?.name || 'Anonymous', student?.id || 'N/A', 'Student'],
    ['Assigned Staff', staff?.name || 'Unassigned', staff?.id || 'N/A', staff?.department || 'N/A']
  ];

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 20,
    head: [partiesData[0]],
    body: partiesData.slice(1),
    theme: 'grid',
    headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold' },
    styles: { fontSize: 10 }
  });

  // Description
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('3. Grievance Description', 20, doc.lastAutoTable.finalY + 15);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const splitDescription = doc.splitTextToSize(grievance.description, pageWidth - 40);
  doc.text(splitDescription, 20, doc.lastAutoTable.finalY + 22);

  // Lifecycle / History
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('4. Resolution Lifecycle', 20, doc.lastAutoTable.finalY + splitDescription.length * 5 + 25);

  const historyData = grievance.history.map(h => [
    new Date(h.timestamp).toLocaleString(),
    h.status.toUpperCase(),
    h.remark || 'N/A'
  ]);

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + splitDescription.length * 5 + 30,
    head: [['Timestamp', 'Status', 'Action/Remark']],
    body: historyData,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 9 }
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'This is an electronically generated report from the DAIT Integrated Campus Grievance Redressal System (ICGRS).',
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 15,
      { align: 'center' }
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  doc.save(`Grievance_Report_${grievance.id}.pdf`);
};
