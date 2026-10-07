/**
 * API 자동화(kyle-agent/api-test-automation) 커버리지와 화면 커버리지를 상품·카테고리 단위로 나란히 보기 위한 자료.
 *  - data/api-coverage.json: scripts/import-api-coverage.ts 가 API 저장소의 data/api_catalog.json · verified_endpoints.json ·
 *    endpoint_status.json 에서 서비스별 숫자만 뽑아 만든 스냅샷(엔드포인트 이름·응답 본문은 넣지 않는다).
 *  - 단위가 다르다: 화면은 "목록 화면 리소스(L2+·L3+)", API 는 "엔드포인트(검증됨)". 비율끼리만 견준다.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { CoverageEntry } from './coverage';

export const API_COVERAGE_FILE = path.resolve(process.cwd(), 'data', 'api-coverage.json');

/** API 카탈로그의 동작 하나: 카탈로그 이름(예 createcluster)·HTTP 메서드·검증 여부. 본문·경로는 넣지 않는다 */
export interface ApiOp {
  name: string;
  method: string;
  verified: boolean;
}

export interface ApiServiceCoverage {
  category: string;
  service: string;
  total: number;
  verified: number;
  ok2xx: number;
  /** 동작 목록(2026-10-07 부터). 예전 스냅샷에는 없다 */
  ops?: ApiOp[];
}

export interface ApiCoverageSnapshot {
  source: string;
  source_commit: string;
  source_date: string;
  imported: string;
  services: ApiServiceCoverage[];
}

/** API 카테고리 slug → 화면 카테고리 이름 */
export const API_CATEGORY: Record<string, string> = {
  'ai-ml': 'AI-ML',
  'application-service': 'Application Service',
  compute: 'Compute',
  container: 'Container',
  'data-analytics': 'Data Analytics',
  database: 'Database',
  'devops-tools': 'DevOps Tools',
  'financial-management': 'Financial Management',
  management: 'Management',
  networking: 'Networking',
  security: 'Security',
  storage: 'Storage',
  platform: 'Platform',
};

/** API 서비스 slug → 화면 상품 이름(coverage.yaml 의 service). 화면 장부에 없는 것은 null */
export const API_SERVICE: Record<string, string | null> = {
  'aimlops-platform': null,
  'cloud-ml': null,
  apigateway: 'API Gateway',
  messagehub: 'Message Hub',
  queueservice: 'Queue Service',
  baremetal: 'Bare Metal Server',
  multinodegpucluster: 'Multi-node GPU Cluster',
  scf: 'Cloud Functions',
  virtualserver: 'Virtual Server',
  scr: 'Container Registry',
  ske: 'Kubernetes Engine',
  'data-flow': null,
  'data-ops': null,
  'quick-query': null,
  eventstreams: 'Event Streams',
  searchengine: 'Search Engine',
  vertica: 'Vertica(DBaaS)',
  cachestore: 'CacheStore(DBaaS)',
  epas: 'EPAS(DBaaS)',
  mariadb: 'MariaDB(DBaaS)',
  mysql: 'MySQL(DBaaS)',
  postgresql: 'PostgreSQL(DBaaS)',
  sqlserver: 'Microsoft SQL Server(DBaaS)',
  devopsservice: 'DevOps Service',
  billingplan: null,
  budget: null,
  costexplorer: null,
  costnavigator: null,
  pricing: null,
  cloudcontrol: null,
  cloudmonitoring: null,
  iam: 'IAM',
  'iam-identity-center': 'ID Center',
  loggingaudit: 'Logging&Audit',
  'network-logging': null,
  organization: 'Organization',
  quota: null,
  resourcemanager: 'Resource Groups',
  resourceoptimizer: null,
  servicewatch: null,
  support: null,
  cdn: 'Global CDN',
  'direct-connect': 'Direct Connect',
  dns: 'DNS',
  firewall: 'Firewall',
  gslb: 'GSLB',
  loadbalancer: 'Load Balancer',
  'security-group': 'Security Group',
  vpc: 'VPC',
  vpn: 'VPN',
  product: null,
  sts: null,
  certificatemanager: 'Certificate Manager',
  cnapp: null,
  configinspection: 'Config Inspection',
  kms: 'Key Management Service',
  secretsmanager: 'Secrets Manager',
  secretvault: 'Secret Vault',
  archivestorage: 'Archive Storage',
  backup: 'Backup',
  'baremetal-blockstorage': 'Block Storage(BM)',
  filestorage: 'File Storage',
  'parallel-filestorage': 'Parallel File Storage',
};

/** 스냅샷 JSON: 들여쓰기 2칸, 동작(ops) 항목은 한 줄에 하나 (diff 를 읽기 쉽게) */
export function formatApiCoverageJson(snapshot: ApiCoverageSnapshot): string {
  return (
    JSON.stringify(snapshot, null, 2).replace(
      /\{\s*"name": ("[^"]*"),\s*"method": ("[^"]*"),\s*"verified": (true|false)\s*\}/g,
      '{ "name": $1, "method": $2, "verified": $3 }',
    ) + '\n'
  );
}

export function readApiCoverage(file = API_COVERAGE_FILE): ApiCoverageSnapshot | null {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as ApiCoverageSnapshot;
  } catch {
    return null;
  }
}

export interface ProductRow {
  category: string;
  /** 화면 상품 이름. API 에만 있으면 "(API) <slug>" */
  product: string;
  ui: { resources: number; l2: number; l3: number } | null;
  api: { services: string[]; total: number; verified: number } | null;
  /** 모수 제외 사유(있으면 합계에서 빠진다) */
  excluded?: string;
}

export interface CategoryRow {
  category: string;
  ui: { resources: number; l2: number; l3: number };
  api: { total: number; verified: number };
}

/** 화면 장부와 API 스냅샷을 상품 단위로 합친다 */
export function productComparison(
  entries: readonly CoverageEntry[],
  api: ApiCoverageSnapshot | null,
  exclusions: ReadonlyMap<string, string> = new Map(),
): { products: ProductRow[]; categories: CategoryRow[] } {
  const rows = new Map<string, ProductRow>();
  for (const e of entries) {
    const k = `${e.category}|${e.service}`;
    const r = rows.get(k) ?? { category: e.category, product: e.service, ui: { resources: 0, l2: 0, l3: 0 }, api: null };
    r.ui!.resources++;
    if (e.level >= 2) r.ui!.l2++;
    if (e.level >= 3) r.ui!.l3++;
    rows.set(k, r);
  }
  for (const s of api?.services ?? []) {
    const category = API_CATEGORY[s.category] ?? s.category;
    const product = API_SERVICE[s.service];
    const k = product ? `${category}|${product}` : `${category}|(API) ${s.service}`;
    const r = rows.get(k) ?? { category, product: product ?? `(API) ${s.service}`, ui: null, api: null };
    r.api = r.api ?? { services: [], total: 0, verified: 0 };
    r.api.services.push(s.service);
    r.api.total += s.total;
    r.api.verified += s.verified;
    rows.set(k, r);
  }
  const products = [...rows.values()].sort(
    (a, b) => a.category.localeCompare(b.category, 'en') || a.product.localeCompare(b.product, 'en'),
  );
  const cats = new Map<string, CategoryRow>();
  for (const p of products) if (exclusions.has(p.product)) p.excluded = exclusions.get(p.product);
  for (const p of products) {
    if (p.excluded) continue;
    const c = cats.get(p.category) ?? { category: p.category, ui: { resources: 0, l2: 0, l3: 0 }, api: { total: 0, verified: 0 } };
    if (p.ui) {
      c.ui.resources += p.ui.resources;
      c.ui.l2 += p.ui.l2;
      c.ui.l3 += p.ui.l3;
    }
    if (p.api) {
      c.api.total += p.api.total;
      c.api.verified += p.api.verified;
    }
    cats.set(p.category, c);
  }
  return { products, categories: [...cats.values()].sort((a, b) => a.category.localeCompare(b.category, 'en')) };
}
