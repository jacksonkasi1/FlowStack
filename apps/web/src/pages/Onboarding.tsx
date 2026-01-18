// ** import lib
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
            // Call the onboarding API directly
            const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
            const response = await fetch(`${baseURL}/api/auth/onboarding/complete-step`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    stepId: "createOrganization",
                    data: { organizationName: organizationName.trim() },
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to create organization");
            }

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
        <div className="flex min-h-screen items-center justify-center p-4 bg-background">
            <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 shadow-sm">
                <div className="space-y-2 text-center">
                    <h1 className="text-2xl font-bold">Welcome! Let's get started</h1>
                    <p className="text-sm text-muted-foreground">
                        Create your organization to continue
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label
                            htmlFor="organizationName"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Organization Name
                        </label>
                        <input
                            id="organizationName"
                            type="text"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Enter your organization name"
                            value={organizationName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setOrganizationName(e.target.value)
                            }
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
            </div>
        </div>
    );
}
