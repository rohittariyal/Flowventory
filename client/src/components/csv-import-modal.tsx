import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Upload, FileSpreadsheet, X, CheckCircle } from "lucide-react";

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any[], type: 'inventory' | 'sales') => void;
  importType: 'inventory' | 'sales';
}

export function CSVImportModal({ isOpen, onClose, onImport, importType }: CSVImportModalProps) {
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');

  const cleanHeader = (header: string): string => {
    return header
      .trim()
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/^\w/, (c) => c.toUpperCase()); // Capitalize first letter
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], data: [] };

    const rawHeaders = lines[0].split(',');
    const cleanHeaders = rawHeaders.map(cleanHeader);
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row: any = {};
      
      cleanHeaders.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });
      
      data.push(row);
    }

    return { headers: cleanHeaders, data };
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const csvText = e.target?.result as string;
        const { headers, data } = parseCSV(csvText);
        setHeaders(headers);
        setCsvData(data);
        setStep('preview');
      };
      
      reader.readAsText(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    multiple: false,
  });

  const handleImport = () => {
    onImport(csvData, importType);
    setStep('success');
    
    // Auto-close after 2 seconds
    setTimeout(() => {
      handleClose();
    }, 2000);
  };

  const handleClose = () => {
    setCsvData([]);
    setHeaders([]);
    setFileName('');
    setStep('upload');
    onClose();
  };

  const getImportTypeDetails = () => {
    switch (importType) {
      case 'inventory':
        return {
          title: 'Import Inventory Data',
          description: 'Upload a CSV file with your inventory data',
          icon: <Upload className="h-5 w-5" />,
          expectedHeaders: ['SKU', 'Product Name', 'Stock', 'Price', 'Category', 'Velocity']
        };
      case 'sales':
        return {
          title: 'Import Sales Data',
          description: 'Upload a CSV file with your sales data',
          icon: <FileSpreadsheet className="h-5 w-5" />,
          expectedHeaders: ['Date', 'SKU', 'Amount', 'Platform', 'Quantity', 'Customer']
        };
      default:
        return {
          title: 'Import Data',
          description: 'Upload a CSV file',
          icon: <Upload className="h-5 w-5" />,
          expectedHeaders: []
        };
    }
  };

  const details = getImportTypeDetails();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-foreground">
            {details.icon}
            <span>{details.title}</span>
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            <div className="text-sm text-muted-foreground">
              {details.description}
            </div>

            {/* Expected Headers */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Expected CSV Headers:</div>
              <div className="flex flex-wrap gap-2">
                {details.expectedHeaders.map((header, index) => (
                  <Badge key={index} variant="outline" className="text-muted-foreground">
                    {header}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Upload Area */}
            <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors">
              <CardContent className="p-8">
                <div
                  {...getRootProps()}
                  className={`text-center cursor-pointer ${
                    isDragActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 mx-auto mb-4 text-primary" />
                  {isDragActive ? (
                    <p className="text-lg">Drop the CSV file here...</p>
                  ) : (
                    <div>
                      <p className="text-lg mb-2">
                        Drag & drop a CSV file here, or click to select
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Only .csv files are supported
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">File: {fileName}</div>
                <div className="text-sm text-muted-foreground">{csvData.length} records found</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
                <X className="h-4 w-4 mr-1" />
                Change File
              </Button>
            </div>

            <Separator />

            {/* Headers */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Detected Headers (cleaned):</div>
              <div className="flex flex-wrap gap-2">
                {headers.map((header, index) => (
                  <Badge key={index} className="bg-primary/20 text-primary border-primary/30">
                    {header}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Data Preview */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Data Preview (first 5 rows):</div>
              <Card className="bg-secondary">
                <CardContent className="p-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left">
                          {headers.map((header, index) => (
                            <th key={index} className="p-2 font-medium text-foreground border-b border-border">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 5).map((row, index) => (
                          <tr key={index} className="border-b border-border/50">
                            {headers.map((header, colIndex) => (
                              <td key={colIndex} className="p-2 text-muted-foreground">
                                {row[header] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-400" />
            <div className="text-lg font-medium text-foreground mb-2">
              Import Successful!
            </div>
            <div className="text-sm text-muted-foreground">
              {csvData.length} {importType} records have been imported successfully.
              The data is now visible in your dashboard.
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'preview' && (
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={handleImport} className="bg-primary hover:bg-primary/90">
                Import {csvData.length} Records
              </Button>
            </div>
          )}
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
          {step === 'success' && (
            <Button onClick={handleClose} className="bg-primary hover:bg-primary/90">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}