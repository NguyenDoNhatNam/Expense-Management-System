"use client";

import React from "react";
import { useApp } from "@/lib/AppContext";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";

export default function SettingsPage() {
  const { currentUser, categories } = useApp();

  const handleExportData = () => {
    const data = {
      user: currentUser,
      categories,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expenseflow-backup.json";
    a.click();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          // In a real app, you would parse and import the data
          alert("Import functionality would restore your data from backup");
        } catch (error) {
          alert("Failed to import data");
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Settings</h2>
        <p className="text-muted-foreground mt-1">
          Manage your profile and data preferences
        </p>
      </div>

      {/* User Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <Input
                value={currentUser?.fullName || ""}
                disabled
                className="mt-2 bg-secondary"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                value={currentUser?.email || ""}
                disabled
                className="mt-2 bg-secondary"
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Account created:{" "}
              {currentUser?.createdAt
                ? new Date(currentUser.createdAt).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Data Backup */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Backup and restore your data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm mb-3">
              Export all your data to keep a secure backup
            </p>
            <Button
              onClick={handleExportData}
              variant="outline"
              className="w-full bg-transparent"
            >
              📥 Export Data Backup
            </Button>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm mb-3">
              Restore data from a previous backup file
            </p>
            <label className="block">
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full cursor-pointer bg-transparent"
              >
                📤 Import Data Backup
              </Button>
            </label>
          </div>

          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
            <p className="text-sm text-warning">
              ⚠️ <span className="font-medium">Note:</span> Your data is stored
              locally in your browser. Clearing browser data will remove
              everything.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
