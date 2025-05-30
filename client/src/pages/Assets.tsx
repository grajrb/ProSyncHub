import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { insertAssetSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Assets() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch assets
  const { data: assets, isLoading } = useQuery({
    queryKey: ["/api/assets"],
  });

  // Fetch reference data
  const { data: locations } = useQuery({
    queryKey: ["/api/locations"],
  });

  const { data: assetTypes } = useQuery({
    queryKey: ["/api/asset-types"],
  });

  // Create asset mutation
  const createAssetMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/assets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Asset created successfully",
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create asset",
        variant: "destructive",
      });
    },
  });

  // Form setup
  const form = useForm({
    resolver: zodResolver(insertAssetSchema),
    defaultValues: {
      assetTag: "",
      name: "",
      description: "",
      model: "",
      manufacturer: "",
      serialNumber: "",
      locationId: undefined,
      assetTypeId: undefined,
      currentStatus: "operational",
    },
  });

  const onSubmit = (data: any) => {
    createAssetMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-status-success text-white';
      case 'maintenance': return 'bg-status-warning text-white';
      case 'offline': return 'bg-status-error text-white';
      case 'error': return 'bg-status-error text-white';
      default: return 'bg-neutral-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-inter font-semibold text-2xl text-neutral-900">Assets</h1>
          <p className="text-neutral-600">Manage your industrial assets and equipment</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary-500 hover:bg-primary-600">
              <i className="fas fa-plus mr-2"></i>
              Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Asset</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="assetTag"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset Tag</FormLabel>
                        <FormControl>
                          <Input placeholder="AST-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Boiler Unit A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Asset description..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="manufacturer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manufacturer</FormLabel>
                        <FormControl>
                          <Input placeholder="Manufacturer name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <FormControl>
                          <Input placeholder="Model number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Serial number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="locationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {locations?.map((location: any) => (
                              <SelectItem key={location.id} value={location.id.toString()}>
                                {location.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="assetTypeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset Type</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {assetTypes?.map((type: any) => (
                              <SelectItem key={type.id} value={type.id.toString()}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createAssetMutation.isPending}
                    className="bg-primary-500 hover:bg-primary-600"
                  >
                    {createAssetMutation.isPending ? "Creating..." : "Create Asset"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }, (_, i) => (
            <Card key={i} className="border-neutral-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-neutral-200 rounded-lg animate-pulse"></div>
                    <div>
                      <div className="h-4 w-24 bg-neutral-200 rounded animate-pulse mb-2"></div>
                      <div className="h-3 w-16 bg-neutral-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                  <div className="h-6 w-16 bg-neutral-200 rounded-full animate-pulse"></div>
                </div>
              </CardHeader>
            </Card>
          ))
        ) : (
          assets?.map((asset: any) => (
            <Card key={asset.id} className="border-neutral-200 hover:border-primary-300 transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center">
                      <i className="fas fa-cogs text-white"></i>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{asset.name}</CardTitle>
                      <p className="text-sm text-neutral-600">{asset.assetTag}</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(asset.currentStatus)}>
                    {asset.currentStatus}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Manufacturer:</span>
                    <span className="font-medium">{asset.manufacturer || '-'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Model:</span>
                    <span className="font-medium">{asset.model || '-'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Serial Number:</span>
                    <span className="font-medium">{asset.serialNumber || '-'}</span>
                  </div>
                  {asset.description && (
                    <p className="text-sm text-neutral-600 mt-3 line-clamp-2">
                      {asset.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {!isLoading && (!assets || assets.length === 0) && (
        <Card className="border-neutral-200">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-cogs text-neutral-400 text-2xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">No Assets Found</h3>
            <p className="text-neutral-600 mb-4">Get started by adding your first industrial asset.</p>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-primary-500 hover:bg-primary-600"
            >
              <i className="fas fa-plus mr-2"></i>
              Add Your First Asset
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
