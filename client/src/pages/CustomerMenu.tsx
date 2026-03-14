import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  available: boolean | null;
}

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export default function CustomerMenu() {
  const { tableToken } = useParams<{ tableToken: string }>();
  const [cart, setCart] = useState<CartItem[]>([]);

  const { data: table, isLoading: isLoadingTable, error: tableError } = trpc.qrOrders.resolveTableByToken.useQuery(
    { token: tableToken || "" },
    { enabled: !!tableToken }
  );

  const { data: menuData, isLoading: isLoadingMenu, error: menuError } = trpc.menu.getMenuItems.useQuery(
    { cafeteriaId: table?.cafeteriaId || "" },
    { enabled: !!table?.cafeteriaId }
  );

  const createOrderMutation = trpc.qrOrders.createCustomerOrder.useMutation({
    onSuccess: (order) => {
      toast.success("Order submitted successfully!");
      setCart([]);
      setTimeout(() => {
        window.location.href = `/order-confirmation/${order.orderId}`;
      }, 1000);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit order");
    },
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    if (tableError) {
      toast.error(tableError.message || "Failed to load table");
    }
  }, [tableError]);

  useEffect(() => {
    if (menuError) {
      toast.error(menuError.message || "Failed to load menu");
    }
  }, [menuError]);

  useEffect(() => {
    if (menuData) {
      const grouped: Record<string, any> = {};
      menuData.forEach((item: any) => {
        if (!grouped[item.categoryId]) {
          grouped[item.categoryId] = {
            id: item.categoryId,
            name: item.categoryName,
            items: [],
          };
        }
        grouped[item.categoryId].items.push(item);
      });
      setCategories(Object.values(grouped));
      setMenuItems(menuData as any);
    }
  }, [menuData]);

  const addToCart = (item: MenuItem) => {
    const existingItem = cart.find((ci) => ci.menuItemId === item.id);
    if (existingItem) {
      setCart(
        cart.map((ci) =>
          ci.menuItemId === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        )
      );
    } else {
      setCart([
        ...cart,
        {
          menuItemId: item.id,
          name: item.name,
          price: Number(item.price),
          quantity: 1,
        },
      ]);
    }
    toast.success(`${item.name} added to cart`);
  };

  const removeFromCart = (menuItemId: string) => {
    setCart(cart.filter((ci) => ci.menuItemId !== menuItemId));
  };

  const updateQuantity = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(menuItemId);
    } else {
      setCart(
        cart.map((ci) =>
          ci.menuItemId === menuItemId ? { ...ci, quantity } : ci
        )
      );
    }
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const submitOrder = async () => {
    if (cart.length === 0) {
      toast.error("Please add items to your order");
      return;
    }

    createOrderMutation.mutate({
      token: tableToken || "",
      items: cart.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
      })),
    });
  };

  if (isLoadingTable || isLoadingMenu) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!table) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Table</h1>
          <p className="text-gray-600">The table token is invalid or expired.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Table {table.tableNumber}</h1>
              <p className="text-gray-600 text-sm">Order from your table</p>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {cart.length} items
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Menu Items */}
          <div className="lg:col-span-2">
            {categories.map((category) => (
              <div key={category.id} className="mb-8">
                <h2 className="text-xl font-semibold mb-4">{category.name}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.items.map((item: MenuItem) => (
                    <Card
                      key={item.id}
                      className="p-4 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{item.name}</h3>
                        <Badge variant="secondary">
                          ${Number(item.price).toFixed(2)}
                        </Badge>
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 mb-3">
                          {item.description}
                        </p>
                      )}
                      <Button
                        onClick={() => addToCart(item)}
                        disabled={!item.available}
                        className="w-full"
                        variant={item.available ? "default" : "outline"}
                      >
                        {item.available ? "Add to Order" : "Unavailable"}
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Cart Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h2 className="text-lg font-bold mb-4">Your Order</h2>

              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No items selected
                </p>
              ) : (
                <>
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                    {cart.map((item) => (
                      <div
                        key={item.menuItemId}
                        className="flex justify-between items-center p-2 bg-gray-50 rounded"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-gray-600">
                            ${item.price.toFixed(2)} x {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateQuantity(
                                item.menuItemId,
                                item.quantity - 1
                              )
                            }
                          >
                            -
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateQuantity(
                                item.menuItemId,
                                item.quantity + 1
                              )
                            }
                          >
                            +
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromCart(item.menuItemId)}
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-semibold">
                        ${getTotalAmount().toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total:</span>
                      <span>${getTotalAmount().toFixed(2)}</span>
                    </div>
                  </div>

                  <Button
                    onClick={submitOrder}
                    disabled={(createOrderMutation as any).isPending || cart.length === 0}
                    className="w-full"
                    size="lg"
                  >
                    {(createOrderMutation as any).isPending ? "Submitting..." : "Submit Order"}
                  </Button>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
