import React, { useState, useCallback } from "react";
import { ethers } from "ethers";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./ui/card";
import { Button } from "./ui/button";
import { parseCSVData } from "../utils/validation";
import Papa from "papaparse";

const FileUpload = ({ onUpload }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file) => {
    setFile(file);
    setIsLoading(true);
    setErrors([]);

    try {
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        Papa.parse(file, {
          complete: (results) => {
            const csvText = results.data.map((row) => row.join(",")).join("\n");
            const { results: parsedData, errors: parseErrors } =
              parseCSVData(csvText);
            setData(parsedData);
            setErrors(parseErrors);
            setIsLoading(false);
          },
          error: (error) => {
            setErrors([`Failed to parse CSV: ${error.message}`]);
            setIsLoading(false);
          },
        });
      } else if (
        file.type === "application/json" ||
        file.name.endsWith(".json")
      ) {
        const text = await file.text();
        const jsonData = JSON.parse(text);

        if (Array.isArray(jsonData)) {
          const parsedData = [];
          const parseErrors = [];

          jsonData.forEach((item, index) => {
            if (!item.address || !item.amount) {
              parseErrors.push(`Item ${index + 1}: Missing address or amount`);
              return;
            }

            if (!ethers.utils.isAddress(item.address)) {
              parseErrors.push(`Item ${index + 1}: Invalid address`);
              return;
            }

            parsedData.push({
              address: ethers.utils.getAddress(item.address),
              amount: item.amount.toString(),
              originalAmount: item.amount.toString(),
            });
          });

          setData(parsedData);
          setErrors(parseErrors);
        } else {
          setErrors(["Invalid JSON format. Expected an array of objects."]);
        }
        setIsLoading(false);
      } else {
        setErrors(["Unsupported file type. Please upload CSV or JSON files."]);
        setIsLoading(false);
      }
    } catch (error) {
      setErrors([`Failed to process file: ${error.message}`]);
      setIsLoading(false);
    }
  };

  const handleProceed = () => {
    if (data.length > 0 && errors.length === 0) {
      onUpload(data);
    }
  };

  const sampleCSV = `address,amount
0x742dB5c6dB6aD6C6c0e8f4c5c7E8E8E8E8E8E8E8,100
0x123dB5c6dB6aD6C6c0e8f4c5c7E8E8E8E8E8E8E8,250
0x456dB5c6dB6aD6C6c0e8f4c5c7E8E8E8E8E8E8E8,500`;

  const downloadSample = () => {
    const blob = new Blob([sampleCSV], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sample-recipients.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Recipients List</CardTitle>
          <CardDescription>
            Upload a CSV or JSON file containing recipient addresses and amounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  Drop your file here, or{" "}
                  <label className="text-blue-600 cursor-pointer hover:text-blue-500">
                    browse
                    <input
                      type="file"
                      className="hidden"
                      accept=".csv,.json"
                      onChange={handleFileSelect}
                    />
                  </label>
                </p>
                <p className="text-sm text-gray-500">
                  CSV or JSON files up to 10MB
                </p>
              </div>
            </div>
          </div>

          {/* Format Guide */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-900">File Format</h3>
              <Button variant="outline" size="sm" onClick={downloadSample}>
                Download Sample
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-2">
                  CSV Format
                </h4>
                <pre className="text-xs bg-white p-2 rounded border font-mono">
                  {`address,amount
0x123...,100
0x456...,250`}
                </pre>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-2">
                  JSON Format
                </h4>
                <pre className="text-xs bg-white p-2 rounded border font-mono">
                  {`[
  {"address": "0x123...", "amount": "100"},
  {"address": "0x456...", "amount": "250"}
]`}
                </pre>
              </div>
            </div>
          </div>

          {/* File Processing Status */}
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">
                Processing file...
              </span>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-red-800 mb-2">
                Errors found:
              </h3>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Success Preview */}
          {data.length > 0 && errors.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-800 mb-2">
                ✅ Successfully loaded {data.length} recipients
              </h3>
              <div className="max-h-40 overflow-y-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-green-200">
                      <th className="text-left py-1 text-green-700">Address</th>
                      <th className="text-right py-1 text-green-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.slice(0, 5).map((item, index) => (
                      <tr key={index} className="border-b border-green-100">
                        <td className="py-1 font-mono text-green-600">
                          {item.address.slice(0, 10)}...{item.address.slice(-8)}
                        </td>
                        <td className="text-right py-1 text-green-600">
                          {item.amount}
                        </td>
                      </tr>
                    ))}
                    {data.length > 5 && (
                      <tr>
                        <td
                          colSpan="2"
                          className="text-center py-1 text-green-500"
                        >
                          ... and {data.length - 5} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-4">
                <Button onClick={handleProceed} className="w-full">
                  Proceed with {data.length} Recipients
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FileUpload;
