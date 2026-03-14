
import { nanoid } from 'nanoid';

class MockDb {
  data: any = {
    marketers: [],
    cafeterias: [],
    sections: [],
    cafeteriaTables: [],
    rechargeRequests: [],
    commissionDistributions: [],
    marketerBalances: [],
    orders: [],
    orderItems: [],
    menuItems: [],
    menuCategories: [],
    commissionConfigs: [],
  };

  async insert(table: any) {
    const tableName = table.name || (table.config && table.config.name);
    return {
      values: async (values: any) => {
        const rows = Array.isArray(values) ? values : [values];
        this.data[tableName].push(...rows);
        return rows;
      }
    };
  }

  async select(fields?: any) {
    return {
      from: (table: any) => {
        const tableName = table.name || (table.config && table.config.name);
        return {
          where: (condition: any) => {
            // Simplified filtering for mock
            let results = [...this.data[tableName]];
            // We'll manually filter in tests or keep it simple
            return results;
          },
          limit: (n: number) => {
            return this.data[tableName].slice(0, n);
          }
        };
      }
    };
  }

  async update(table: any) {
    const tableName = table.name || (table.config && table.config.name);
    return {
      set: (values: any) => ({
        where: (condition: any) => {
           // Mock update
           return true;
        }
      })
    };
  }
}

export const mockDb = new MockDb();
