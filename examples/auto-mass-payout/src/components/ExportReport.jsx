import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./ui/card";
import { Button } from "./ui/button";
import { downloadFile, formatDate } from "../utils/helpers";
import { truncateAddress } from "../utils/helpers";

const ExportReport = ({
  results,
  selectedToken,
  transactionData,
  onStartOver,
}) => {
  const successfulPayouts = results.filter((r) => r.success);
  const failedPayouts = results.filter((r) => !r.success);

  const exportCSV = () => {
    const csvHeader = "Address,Amount,Status,Transaction Hash,Block Number\n";
    const csvData = results
      .map(
        (result) =>
          `${result.address},${result.amount},${
            result.success ? "Success" : "Failed"
          },${result.transactionHash || ""},${result.blockNumber || ""}`
      )
      .join("\n");

    const csv = csvHeader + csvData;
    const filename = `mass-payout-${selectedToken.symbol}-${Date.now()}.csv`;
    downloadFile(csv, filename, "text/csv");
  };

  const exportJSON = () => {
    const data = {
      timestamp: new Date().toISOString(),
      token: selectedToken,
      summary: {
        totalRecipients: results.length,
        successfulPayouts: successfulPayouts.length,
        failedPayouts: failedPayouts.length,
        totalAmount: results.reduce((sum, r) => sum + parseFloat(r.amount), 0),
      },
      results: results,
    };

    const json = JSON.stringify(data, null, 2);
    const filename = `mass-payout-${selectedToken.symbol}-${Date.now()}.json`;
    downloadFile(json, filename, "application/json");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
              ✓
            </div>
            <span>Payout Complete!</span>
          </CardTitle>
          <CardDescription>
            Mass payout execution finished. Review the results below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {successfulPayouts.length}
              </div>
              <div className="text-sm text-green-600">Successful</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {failedPayouts.length}
              </div>
              <div className="text-sm text-red-600">Failed</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {results.length}
              </div>
              <div className="text-sm text-blue-600">Total Recipients</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {results
                  .reduce((sum, r) => sum + parseFloat(r.amount), 0)
                  .toFixed(2)}
              </div>
              <div className="text-sm text-purple-600">
                {selectedToken.symbol} Distributed
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              Transaction Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Token</div>
                <div className="font-medium">
                  {selectedToken.name} ({selectedToken.symbol})
                </div>
              </div>
              <div>
                <div className="text-gray-500">Transaction Hash</div>
                <div className="font-mono text-xs">
                  {results[0]?.transactionHash
                    ? truncateAddress(results[0].transactionHash, 12, 8)
                    : "N/A"}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Block Number</div>
                <div className="font-medium">
                  {results[0]?.blockNumber || "N/A"}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Timestamp</div>
                <div className="font-medium">
                  {formatDate(Date.now() / 1000)}
                </div>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="border rounded-lg">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h3 className="text-base font-semibold text-gray-900">
                Payout Results
              </h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Address
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {results.map((result, index) => (
                    <tr
                      key={index}
                      className={result.success ? "bg-white" : "bg-red-50"}
                    >
                      <td className="px-4 py-2 text-sm font-mono text-gray-600">
                        {truncateAddress(result.address)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-gray-900">
                        {result.amount} {selectedToken.symbol}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {result.success ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Export Options */}
          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={exportCSV} variant="outline">
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export CSV
            </Button>
            <Button onClick={exportJSON} variant="outline">
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export JSON
            </Button>
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <Button
            onClick={onStartOver}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Start New Payout
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ExportReport;
