import { NextResponse } from "next/server";
import { getRecorderStatus } from "@/lib/recorder";

export async function GET(request: Request) {
    try {
        const status = await getRecorderStatus();
        return NextResponse.json({ status }, { status: 200 });
    } catch (error) {
        console.error("API Error getting recorder status:", error);
        return NextResponse.json({ error: "Failed to get recorder status" }, { status: 500 });
    }
}
