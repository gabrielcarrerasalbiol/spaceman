import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/permissions';
import { z } from 'zod';

// Query parameter validation schema
const auditLogsQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  action: z
    .enum([
      'CREATE',
      'UPDATE',
      'DELETE',
      'LOGIN',
      'LOGOUT',
      'EXPORT',
      'IMPORT',
      'SYNC',
      'SETTINGS_UPDATE',
    ])
    .optional(),
  entityType: z.string().optional(),
  userId: z.string().optional(),
  search: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const queryParams = auditLogsQuerySchema.safeParse(
      Object.fromEntries(searchParams)
    );

    if (!queryParams.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryParams.error.errors },
        { status: 400 }
      );
    }

    const page = parseInt(queryParams.data.page);
    const limit = Math.min(parseInt(queryParams.data.limit), 100); // Max 100 per page
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Date range filter
    if (queryParams.data.startDate || queryParams.data.endDate) {
      where.createdAt = {};
      if (queryParams.data.startDate) {
        where.createdAt.gte = new Date(queryParams.data.startDate);
      }
      if (queryParams.data.endDate) {
        // Include the entire end date
        const endDate = new Date(queryParams.data.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // Action filter
    if (queryParams.data.action) {
      where.action = queryParams.data.action;
    }

    // Entity type filter
    if (queryParams.data.entityType) {
      where.entityType = queryParams.data.entityType;
    }

    // User filter
    if (queryParams.data.userId) {
      where.userId = BigInt(queryParams.data.userId);
    }

    // Search in description
    if (queryParams.data.search) {
      where.description = {
        contains: queryParams.data.search,
        mode: 'insensitive',
      };
    }

    // Get total count
    const total = await prisma.auditLog.count({ where });

    // Fetch logs with pagination
    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Format response
    const formattedLogs = logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      description: log.description,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString(),
      user: {
        id: log.user.id.toString(),
        email: log.user.email,
        username: log.user.username,
      },
    }));

    return NextResponse.json({
      logs: formattedLogs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
