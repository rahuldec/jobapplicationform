"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge, Button, inputClass, PlaceholderChips } from "@/components/ui/primitives";
import { APPLICATION_STATUS_LABELS, SETTABLE_APPLICATION_STATUSES } from "@/lib/enums";
import { bulkChangeApplicationStatus, bulkAssignRecruiter, bulkSendCandidateEmail } from "@/lib/actions/applications";
import { INTERVIEW_EMAIL_PLACEHOLDERS } from "@/lib/email";

const MAX_SYNOPSIS_SELECTION = 100;

export type ApplicationRow = {
  id: string;
  serial: number;
  applicationNumber: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  status: string;
  assignedRecruiterId: string | null;
  assignedRecruiterName: string | null;
  appliedLabel: string;
};

export function ApplicationsTable({
  rows,
  recruiters,
  defaultEmailSubject,
  defaultEmailBody,
}: {
  rows: ApplicationRow[];
  recruiters: { id: string; name: string }[];
  defaultEmailSubject: string;
  defaultEmailBody: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>(SETTABLE_APPLICATION_STATUSES[0]);
  const [bulkRecruiterId, setBulkRecruiterId] = useState<string>("");
  const [applyingStatus, setApplyingStatus] = useState(false);
  const [applyingAssign, setApplyingAssign] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<string | null>(null);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_SYNOPSIS_SELECTION) next.add(id);
      return next;
    });
  };

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.slice(0, MAX_SYNOPSIS_SELECTION).map((r) => r.id)));
  const atLimit = selected.size >= MAX_SYNOPSIS_SELECTION;

  const handleBulkStatus = async () => {
    setApplyingStatus(true);
    try {
      await bulkChangeApplicationStatus({ applicationIds: Array.from(selected), status: bulkStatus });
      setSelected(new Set());
      router.refresh();
    } finally {
      setApplyingStatus(false);
    }
  };

  const handleBulkAssign = async () => {
    setApplyingAssign(true);
    try {
      await bulkAssignRecruiter({ applicationIds: Array.from(selected), recruiterId: bulkRecruiterId || null });
      setSelected(new Set());
      router.refresh();
    } finally {
      setApplyingAssign(false);
    }
  };

  const handleBulkEmail = async () => {
    setSendingEmail(true);
    setEmailResult(null);
    try {
      const { sent, failed } = await bulkSendCandidateEmail({
        applicationIds: Array.from(selected),
        subject: emailSubject,
        body: emailBody,
      });
      setEmailResult(failed > 0 ? `Sent ${sent}, failed ${failed}.` : `Sent to all ${sent} candidates.`);
      if (failed === 0) {
        setShowEmailComposer(false);
        setEmailSubject("");
        setEmailBody("");
        setSelected(new Set());
      }
      router.refresh();
    } catch (err) {
      setEmailResult(err instanceof Error ? err.message : "Failed to send emails.");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <>
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-orange-100 bg-orange-50 px-4 py-3">
          <span className="text-sm font-medium text-orange-800">
            {selected.size} selected
            {atLimit && <span className="ml-1.5 font-normal text-orange-600">(max {MAX_SYNOPSIS_SELECTION})</span>}
          </span>

          <div className="flex items-center gap-1.5">
            <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className={`${inputClass} w-44 py-1.5 text-sm`}>
              {SETTABLE_APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {APPLICATION_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <Button variant="secondary" size="sm" onClick={handleBulkStatus} disabled={applyingStatus}>
              {applyingStatus ? "Applying…" : "Set Status"}
            </Button>
          </div>

          <div className="flex items-center gap-1.5">
            <select value={bulkRecruiterId} onChange={(e) => setBulkRecruiterId(e.target.value)} className={`${inputClass} w-44 py-1.5 text-sm`}>
              <option value="">— Unassign —</option>
              {recruiters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <Button variant="secondary" size="sm" onClick={handleBulkAssign} disabled={applyingAssign}>
              {applyingAssign ? "Assigning…" : "Assign"}
            </Button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setShowEmailComposer((v) => !v);
              setEmailResult(null);
              // Prefill from the tenant's saved interview email template the
              // first time the composer opens, so admins aren't retyping it
              // every time — {placeholders} resolve per candidate on send.
              if (!emailSubject && !emailBody) {
                setEmailSubject(defaultEmailSubject);
                setEmailBody(defaultEmailBody);
              }
            }}
          >
            Email
          </Button>

          <a href={`/api/export/synopsis?ids=${Array.from(selected).join(",")}`} className="ml-auto">
            <Button variant="secondary" size="sm">
              Download Synopsis ({selected.size})
            </Button>
          </a>
        </div>
      )}

      {selected.size > 0 && showEmailComposer && (
        <div className="space-y-2.5 border-b border-orange-100 bg-orange-50/60 px-4 py-3">
          <input
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            placeholder="Subject"
            className={`${inputClass} bg-white`}
          />
          <textarea
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            placeholder={`Message — sent individually to all ${selected.size} selected candidates.`}
            rows={7}
            className={`${inputClass} bg-white font-mono text-xs`}
          />
          <p className="text-xs text-slate-500">
            Prefilled from the tenant&apos;s Interview email template — edit freely.{" "}
            <PlaceholderChips names={INTERVIEW_EMAIL_PLACEHOLDERS} /> resolve per candidate; scheduling ones are blank if
            that candidate has no interview on record.
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleBulkEmail}
              disabled={sendingEmail || !emailSubject.trim() || !emailBody.trim()}
            >
              {sendingEmail ? "Sending…" : `Send to ${selected.size}`}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowEmailComposer(false)} disabled={sendingEmail}>
              Cancel
            </Button>
            {emailResult && <span className="text-xs text-orange-700">{emailResult}</span>}
          </div>
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="w-9 px-4 py-2.5">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Select all applications on this page"
                className="h-3.5 w-3.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
              />
            </th>
            <th className="px-4 py-2.5">#</th>
            <th className="px-4 py-2.5">Application #</th>
            <th className="px-4 py-2.5">Candidate</th>
            <th className="px-4 py-2.5">Job</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5">Recruiter</th>
            <th className="px-4 py-2.5">Applied</th>
            <th className="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((app) => {
            const isSelected = selected.has(app.id);
            return (
              <tr key={app.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(app.id)}
                    disabled={!isSelected && atLimit}
                    aria-label={`Select ${app.applicationNumber}`}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500 disabled:opacity-40"
                  />
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-500">{app.serial}</td>
                <td className="px-4 py-3">
                  <Link href={`/applications/${app.id}`} className="font-medium text-orange-600 hover:underline">
                    {app.applicationNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {app.candidateName}
                  <p className="text-xs text-slate-400">{app.candidateEmail}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{app.jobTitle}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={app.status} label={APPLICATION_STATUS_LABELS[app.status as keyof typeof APPLICATION_STATUS_LABELS] ?? app.status} />
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {app.assignedRecruiterName ?? <span className="text-slate-400 italic">Unassigned</span>}
                </td>
                <td className="px-4 py-3 text-slate-500">{app.appliedLabel}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <a href={`/api/applications/${app.id}/synopsis`} className="text-xs font-medium text-orange-600 hover:underline">
                    Synopsis
                  </a>
                  <span className="mx-1.5 text-slate-300">·</span>
                  <a
                    href={`/api/export/documents?groupBy=candidate&includeSynopsis=true&ids=${app.id}`}
                    className="text-xs font-medium text-orange-600 hover:underline"
                  >
                    Docs
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
