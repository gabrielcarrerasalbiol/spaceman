import { Prisma } from '@prisma/client';

const RESERVED_CONTRACT_STATUSES = new Set(['DRAFT', 'PENDING_SIGNATURE']);
const OCCUPIED_CONTRACT_STATUSES = new Set(['ACTIVE']);

export function deriveUnitStatusFromContractStatus(status: string | null | undefined) {
  if (status && OCCUPIED_CONTRACT_STATUSES.has(status)) return 'OCCUPIED';
  if (status && RESERVED_CONTRACT_STATUSES.has(status)) return 'RESERVED';
  return 'AVAILABLE';
}

export async function syncUnitStatusFromContracts(tx: Prisma.TransactionClient, unitId: string) {
  const relatedContracts = await tx.contract.findMany({
    where: { unitId },
    select: { status: true },
  });

  let nextStatus: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' = 'AVAILABLE';

  if (relatedContracts.some((contract) => OCCUPIED_CONTRACT_STATUSES.has(contract.status))) {
    nextStatus = 'OCCUPIED';
  } else if (relatedContracts.some((contract) => RESERVED_CONTRACT_STATUSES.has(contract.status))) {
    nextStatus = 'RESERVED';
  }

  await tx.unit.update({
    where: { id: unitId },
    data: { status: nextStatus },
  });
}

export async function syncMultipleUnitStatuses(tx: Prisma.TransactionClient, unitIds: Array<string | null | undefined>) {
  const uniqueUnitIds = [...new Set(unitIds.filter((value): value is string => Boolean(value)))];
  for (const unitId of uniqueUnitIds) {
    await syncUnitStatusFromContracts(tx, unitId);
  }
}