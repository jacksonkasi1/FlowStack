// ** import lib
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export default function Onboarding() {
    const navigate = useNavigate();
    const [organizationName, setOrganizationName] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!organizationName.trim()) {
            toast.error("Please enter an organization name");
            return;
        }

        setIsLoading(true);

        try {
            // Complete the onboarding step
            await authClient.onboarding.completeStep({
                stepId: "createOrganization",
                data: { organizationName: organizationName.trim() },
            });

            toast.success("Organization created successfully!");
            navigate("/dashboard");
        } catch (error) {
            console.error("Failed to create organization:", error);
            toast.error(
                error instanceof Error ? error.message : "Failed to create organization"
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Welcome! Let's get started</CardTitle>
                    <CardDescription>
                        Create your organization to continue
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="organizationName">Organization Name</Label>
                            <Input
                                id="organizationName"
                                type="text"
                                placeholder="Enter your organization name"
                                value={organizationName}
                                onChange={(e) => setOrganizationName(e.target.value)}
                                disabled={isLoading}
                                required
                                minLength={2}
                                maxLength={100}
                            />
                            <p className="text-sm text-muted-foreground">
                                This will be your workspace name
                            </p>
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Creating..." : "Create Organization"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
