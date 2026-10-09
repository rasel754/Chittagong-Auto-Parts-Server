export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Chittagong Auto Parts Inventory & Supply Tracker API',
    version: '1.0.0',
    description: `
**Production Multi-Shop REST API for Chittagong Auto Parts Inventory & Supply Tracker**
Built with Node.js, TypeScript, Express, MongoDB, and Zod.

### Key Architectural Highlights:
* **Authentication**: Phone Number & Password (No Email required). Normalized for Bangladesh (01XXXXXXXXX).
* **Multi-Shop Data Isolation**: Dynamically creates shops (Chittagong Shop, Dhaka Shop, etc.).
* **Weighted-Average Costing**: Real-time accurate inventory valuation on incoming stock.
* **Concurrency-Safe Sales**: Atomic stock deductions preventing overselling.
* **Dual Dashboards**: Global overview across all authorized shops + Shop-specific dashboard.
* **Immutable Audit Trail**: StockMovement ledger tracking every stock change.
    `
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide your JWT bearer token (e.g., Bearer eyJhbGciOiJIUzI1Ni...)'
      }
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object' },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 20 },
              total: { type: 'integer', example: 45 },
              totalPages: { type: 'integer', example: 3 }
            }
          }
        }
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Insufficient stock' },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'INSUFFICIENT_STOCK' },
              details: { type: 'object' }
            }
          }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['phone', 'password'],
        properties: {
          phone: { type: 'string', example: '01811000000' },
          password: { type: 'string', example: 'AdminPassword123!' }
        }
      },
      StockEntryRequest: {
        type: 'object',
        required: ['productId', 'supplierName', 'quantityReceived', 'buyingRatePerPiece'],
        properties: {
          productId: { type: 'string', example: '65f2a1b9c8d7e6f5a4b3c2d1' },
          supplierName: { type: 'string', example: 'Tokyo Auto Spares Ltd.' },
          quantityReceived: { type: 'integer', example: 20 },
          buyingRatePerPiece: { type: 'number', example: 450.0 },
          sellingRatePerPiece: { type: 'number', example: 600.0 },
          notes: { type: 'string', example: 'Consignment import batch A1' }
        }
      },
      SaleRequest: {
        type: 'object',
        required: ['productId', 'quantitySold'],
        properties: {
          productId: { type: 'string', example: '65f2a1b9c8d7e6f5a4b3c2d1' },
          quantitySold: { type: 'integer', example: 3 },
          sellingRatePerPiece: { type: 'number', example: 600.0, description: 'Optional override of default selling rate' },
          notes: { type: 'string', example: 'Customer cash sale' }
        }
      }
    }
  },
  security: [
    {
      BearerAuth: []
    }
  ],
  paths: {
    '/auth/login': {
      post: {
        summary: 'Login with Phone Number and Password',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' }
            }
          }
        },
        responses: {
          200: { description: 'Successful login returning JWT token and user profile' },
          401: { description: 'Invalid phone or password' }
        }
      }
    },
    '/auth/me': {
      get: {
        summary: 'Get Authenticated User Profile',
        tags: ['Authentication'],
        responses: {
          200: { description: 'Current authenticated user profile' },
          401: { description: 'Unauthorized' }
        }
      }
    },
    '/shops': {
      get: {
        summary: 'List authorized shops',
        tags: ['Shops'],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] } }
        ],
        responses: { 200: { description: 'List of accessible shops' } }
      },
      post: {
        summary: 'Create a new shop (Admin only)',
        tags: ['Shops'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', example: 'Sylhet Branch' },
                  code: { type: 'string', example: 'sylhet-branch' },
                  address: { type: 'string', example: 'Zindabazar, Sylhet' },
                  phone: { type: 'string', example: '01711223344' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Shop created successfully' } }
      }
    },
    '/shops/{shopId}/inventory': {
      get: {
        summary: 'Get shop inventory balances with low stock filter',
        tags: ['Inventory'],
        parameters: [
          { name: 'shopId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'lowStockOnly', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } }
        ],
        responses: { 200: { description: 'Shop inventory balances' } }
      }
    },
    '/shops/{shopId}/stock-entries': {
      post: {
        summary: 'Record new incoming stock entry with weighted average costing',
        tags: ['Stock Entries'],
        parameters: [{ name: 'shopId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StockEntryRequest' }
            }
          }
        },
        responses: {
          201: { description: 'Stock recorded and weighted-average unit cost recalculated' }
        }
      },
      get: {
        summary: 'List stock entries for a shop',
        tags: ['Stock Entries'],
        parameters: [
          { name: 'shopId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'startDate', in: 'query', schema: { type: 'string' } },
          { name: 'endDate', in: 'query', schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Stock purchase entries' } }
      }
    },
    '/shops/{shopId}/sales': {
      post: {
        summary: 'Record customer sale with stock deduction and profit calculation',
        tags: ['Sales'],
        parameters: [{ name: 'shopId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SaleRequest' }
            }
          }
        },
        responses: {
          201: { description: 'Sale recorded with gross profit and unit cost captured' },
          400: { description: 'Insufficient stock or inactive shop' }
        }
      },
      get: {
        summary: 'List sales for a shop',
        tags: ['Sales'],
        parameters: [
          { name: 'shopId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'startDate', in: 'query', schema: { type: 'string' } },
          { name: 'endDate', in: 'query', schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Shop sales history' } }
      }
    },
    '/shops/{shopId}/stock-movements': {
      get: {
        summary: 'Get immutable audit ledger of all stock changes',
        tags: ['History & Audit'],
        parameters: [
          { name: 'shopId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'movementType', in: 'query', schema: { type: 'string', enum: ['STOCK_IN', 'SALE', 'ADJUSTMENT', 'RETURN'] } }
        ],
        responses: { 200: { description: 'Stock movement history' } }
      }
    },
    '/dashboard/overview': {
      get: {
        summary: 'Global combined dashboard metrics across all authorized shops',
        tags: ['Dashboard'],
        parameters: [
          { name: 'period', in: 'query', schema: { type: 'string', enum: ['today', 'yesterday', '7d', '30d', 'this_month', 'last_month', 'all_time'] } },
          { name: 'startDate', in: 'query', schema: { type: 'string' } },
          { name: 'endDate', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Global distinct product count, stock units, valuation, revenue, and gross profit' }
        }
      }
    },
    '/shops/{shopId}/dashboard': {
      get: {
        summary: 'Individual shop dashboard metrics',
        tags: ['Dashboard'],
        parameters: [
          { name: 'shopId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'period', in: 'query', schema: { type: 'string', enum: ['today', 'yesterday', '7d', '30d', 'this_month', 'last_month', 'all_time'] } }
        ],
        responses: {
          200: { description: 'Shop-specific inventory valuation, revenue, and gross profit' }
        }
      }
    }
  }
};
