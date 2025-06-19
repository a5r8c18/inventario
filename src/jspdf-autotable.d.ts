import { jsPDF } from 'jspdf';

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
      [key: string]: any;
    };
    autoTable: (options: any) => jsPDF;
  }
}