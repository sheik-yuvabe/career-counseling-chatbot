import type {
  CatalogImportRequest,
  CatalogImportResponse,
} from "@yuvanext/contracts";

export interface CatalogImportCoordinator {
  start(
    request: CatalogImportRequest,
    importId: string,
  ): Promise<CatalogImportResponse>;
  getReport(importId: string): Promise<CatalogImportResponse | null>;
}

export const startCatalogImport = (
  coordinator: CatalogImportCoordinator,
  request: CatalogImportRequest,
  importId: string,
): Promise<CatalogImportResponse> => coordinator.start(request, importId);

export const getCatalogImportReport = (
  coordinator: CatalogImportCoordinator,
  importId: string,
): Promise<CatalogImportResponse | null> => coordinator.getReport(importId);
