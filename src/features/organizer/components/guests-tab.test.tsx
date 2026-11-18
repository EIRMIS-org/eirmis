// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { GuestsTab } from "./guests-tab";

describe("GuestsTab", () => {
  it("renders the guest roster and add-invitation action", () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <GuestsTab eventId="evt-123" />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Guest roster")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add invitation/i }),
    ).toBeInTheDocument();
  });
});
