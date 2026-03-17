"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect,useMemo, useState } from "react";

import PageHeader from "@/components/PageHeader";
import { useCase } from "@/contexts/CaseContext";
import { getPdfBackend, getPdfRemoteServiceUrl } from "@/lib/config";

import ExportSectionHtml from "./ExportSectionHtml";
import ExportSectionJson from "./ExportSectionJson";
import ExportSectionZip from "./ExportSectionZip";

export default function ExportPage() {
  const params = useParams();
  const router = useRouter();
  const invId = params.invId as string;
  const { caseFile, caseFolderHandle } = useCase();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [pdfUnavailable, setPdfUnavailable] = useState<boolean | null>(null);
  const [pdfFallbackBanner, setPdfFallbackBanner] = useState(false);

  const pdfBackend = getPdfBackend();
  const remotePdfUrl = getPdfRemoteServiceUrl();

  useEffect(() => {
    if (pdfBackend === "disabled") {
      setPdfUnavailable(true);
      return;
    }
    fetch("/api/export/pdf/health")
      .then((r) => r.json())
      .then((data) => setPdfUnavailable(!data?.ok))
      .catch(() => setPdfUnavailable(true));
  }, [pdfBackend]);

  const inv = caseFile?.investigations.find((i) => i.id === invId);
  const invEvidence = useMemo(
    () => caseFile?.evidence.filter((e) => e.investigation_id === invId) ?? [],
    [caseFile?.evidence, invId]
  );

  if (!caseFile) return <p>No case loaded.</p>;
  if (!inv) return <p>Investigation not found.</p>;

  return (
    <>
      <PageHeader
        backHref={`/inv/${invId}`}
        backLabel={`← ${inv.title}`}
        title="Export"
      />

      {!caseFolderHandle && (
        <div className="analyst-panel analyst-panelWarn analyst-gap16">
          Audit/custody logging disabled (no case folder open). Downloads still work.
        </div>
      )}

      {error && (
        <div className="analyst-panel analyst-panelDanger analyst-gap16">
          {error}
        </div>
      )}

      <ExportSectionJson
        caseFile={caseFile}
        caseFolderHandle={caseFolderHandle}
        invId={invId}
        loading={loading}
        setLoading={setLoading}
        setError={setError}
      />

      <ExportSectionHtml
        caseFile={caseFile}
        caseFolderHandle={caseFolderHandle}
        invId={invId}
        loading={loading}
        setLoading={setLoading}
        setError={setError}
        onOpenPreview={() => router.push(`/inv/${invId}/export/preview`)}
        pdfBackend={pdfBackend}
        remotePdfUrl={remotePdfUrl}
        pdfUnavailable={pdfUnavailable}
        pdfFallbackBanner={pdfFallbackBanner}
        setPdfFallbackBanner={setPdfFallbackBanner}
        setPdfUnavailable={setPdfUnavailable}
      />

      <ExportSectionZip
        caseFile={caseFile}
        caseFolderHandle={caseFolderHandle}
        invId={invId}
        invEvidence={invEvidence}
        loading={loading}
        setLoading={setLoading}
        setError={setError}
      />
    </>
  );
}
