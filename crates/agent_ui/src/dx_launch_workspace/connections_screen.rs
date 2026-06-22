use gpui::{AnyElement, App, Context, FontWeight, IntoElement, SharedString, Window};
use ui::{AiSettingItem, AiSettingItemSource, AiSettingItemStatus, IconName, Tooltip, prelude::*};

use crate::AgentPanel;
use crate::dx_agent_bridge::DxAgentBridgeSnapshot;

use super::screen_chrome::{
    screen_detail_row, screen_detail_stack, screen_empty_state, screen_section,
    workspace_page_header, workspace_stat,
};
use super::{DxLaunchWorkspaceStatus, agents};

mod catalog;

pub(crate) use catalog::{
    ConnectionCatalogFilter, DxConnectionsCatalogState, render_connections_catalog_rows,
};

pub(crate) fn render_connections_screen(
    status: Option<&DxLaunchWorkspaceStatus>,
    state: &mut DxConnectionsCatalogState,
    window: &mut Window,
    cx: &mut Context<AgentPanel>,
) -> AnyElement {
    let (header_stats, body) = if let Some(status) = status {
        let snapshot = &status.agent_bridge;
        (
            vec![
                workspace_stat(
                    "dx-connections-stat-supported",
                    "Supported",
                    snapshot.connected_accounts_summary.supported.to_string(),
                    cx,
                ),
                workspace_stat(
                    "dx-connections-stat-configured",
                    "Configured",
                    snapshot.connected_accounts_summary.configured.to_string(),
                    cx,
                ),
                workspace_stat(
                    "dx-connections-stat-connected",
                    "Connected",
                    snapshot.connected_accounts_summary.connected.to_string(),
                    cx,
                ),
                workspace_stat(
                    "dx-connections-stat-auth",
                    "Needs auth",
                    snapshot.connected_accounts_summary.needs_auth.to_string(),
                    cx,
                ),
            ],
            v_flex()
                .gap_3()
                .child(catalog::render_connections_catalog(
                    snapshot, state, window, cx,
                ))
                .child(screen_section(
                    "dx-connections-mobile",
                    "Mobile Device Pairing",
                    dx_icon(DxUiIcon::Connections),
                    "Link your phone",
                    mobile_pairing_state(cx),
                    cx,
                ))
                .child(screen_section(
                    "dx-connections-providers",
                    "Providers",
                    dx_icon(DxUiIcon::Gateway),
                    format!(
                        "{} providers / {} models",
                        snapshot.providers.len(),
                        snapshot.models.len()
                    ),
                    agents::dx_agent_provider_state(snapshot, cx),
                    cx,
                ))
                .child(screen_section(
                    "dx-connections-channels",
                    "Channels",
                    dx_icon(DxUiIcon::Channels),
                    format!(
                        "{} supported / {} needs auth",
                        snapshot.connected_accounts_summary.supported,
                        snapshot.connected_accounts_summary.needs_auth
                    ),
                    channel_state(snapshot, cx),
                    cx,
                ))
                .child(screen_section(
                    "dx-connections-social",
                    "Social",
                    dx_icon(DxUiIcon::Connections),
                    format!("{} account rows", snapshot.social_accounts.len()),
                    agents::dx_agent_social_state(snapshot, cx),
                    cx,
                ))
                .child(screen_section(
                    "dx-connections-gateway",
                    "Gateway",
                    dx_icon(DxUiIcon::Gateway),
                    snapshot.status.clone(),
                    gateway_state(snapshot),
                    cx,
                ))
                .child(screen_section(
                    "dx-connections-credentials",
                    "Credentials",
                    dx_icon(DxUiIcon::Credentials),
                    credential_summary(snapshot),
                    credential_state(snapshot),
                    cx,
                ))
                .into_any_element(),
        )
    } else {
        (
            vec![workspace_stat(
                "dx-connections-stat-loading",
                "State",
                "Loading",
                cx,
            )],
            screen_empty_state(
                "dx-connections-loading",
                dx_icon(DxUiIcon::Receipts),
                "Loading provider, social, and credential receipts",
                cx,
            ),
        )
    };

    div()
        .id("dx-connections-screen")
        .size_full()
        .min_w_0()
        .overflow_y_scroll()
        .bg(cx.theme().colors().panel_background)
        .child(
            v_flex()
                .gap_3()
                .p_4()
                .child(workspace_page_header(
                    dx_icon(DxUiIcon::Connections),
                    "Connections",
                    "Providers, channels, social accounts, gateway readiness, and credential health.",
                    header_stats,
                    cx,
                ))
                .child(body),
        )
        .into_any_element()
}

fn mobile_pairing_state(cx: &mut Context<AgentPanel>) -> AnyElement {
    let paired_devices = vec![
        ("My iPhone 15 Pro", "Active", "Just now", IconName::Screen),
        ("iPad Pro 11\"", "Offline", "2 days ago", IconName::Screen),
    ];

    v_flex()
        .gap_6()
        .p_4()
        .bg(cx.theme().colors().editor_background)
        .border_1()
        .border_color(cx.theme().colors().border)
        .rounded_md()
        .child(
            h_flex()
                .gap_8()
                .items_start()
                .child(
                    v_flex()
                        .gap_4()
                        .w_1_2()
                        .child(Label::new("Pair New Device").weight(FontWeight::BOLD))
                        .child(Label::new("Pair with DX Mobile app to continue on the go.").color(Color::Muted))
                        .child(
                            h_flex()
                                .gap_6()
                                .items_center()
                                .child(
                                    // Styled QR code layout
                                    div()
                                        .size(px(160.0))
                                        .p_3()
                                        .bg(gpui::white())
                                        .rounded_xl()
                                        .shadow_sm()
                                        .child(
                                            v_flex()
                                                .size_full()
                                                .justify_between()
                                                .child(
                                                    h_flex()
                                                        .w_full()
                                                        .justify_between()
                                                        .child(div().size(px(36.0)).bg(gpui::black()).rounded_md())
                                                        .child(div().size(px(36.0)).bg(gpui::black()).rounded_md())
                                                )
                                                .child(
                                                    h_flex()
                                                        .w_full()
                                                        .justify_center()
                                                        .child(div().size(px(48.0)).h(px(16.0)).bg(gpui::black()).rounded_sm())
                                                )
                                                .child(
                                                    h_flex()
                                                        .w_full()
                                                        .justify_between()
                                                        .child(div().size(px(36.0)).bg(gpui::black()).rounded_md())
                                                        .child(div().size(px(36.0)).bg(gpui::black()).rounded_md())
                                                )
                                        )
                                )
                                .child(
                                    v_flex()
                                        .gap_3()
                                        .justify_center()
                                        .child(Label::new("1. Open DX Mobile app").color(Color::Default))
                                        .child(Label::new("2. Tap 'Scan to Connect'").color(Color::Default))
                                        .child(Label::new("3. Point camera at QR").color(Color::Default))
                                        .child(
                                            div().mt_2().child(
                                                Button::new("refresh-qr", "Refresh Code")
                                                    .start_icon(Icon::new(IconName::RotateCw).size(IconSize::Small))
                                                    .style(ButtonStyle::Subtle)
                                            )
                                        )
                                )
                        )
                )
                .child(
                    v_flex()
                        .gap_4()
                        .w_1_2()
                        .child(Label::new("Paired Devices").weight(FontWeight::BOLD))
                        .children(
                            paired_devices.into_iter().enumerate().map(|(i, (name, status, last_seen, icon))| {
                                let is_active = status == "Active";
                                h_flex()
                                    .w_full()
                                    .p_3()
                                    .gap_4()
                                    .bg(cx.theme().colors().elevated_surface_background)
                                    .border_1()
                                    .border_color(cx.theme().colors().border_variant)
                                    .rounded_md()
                                    .items_center()
                                    .child(
                                        div()
                                            .p_2()
                                            .bg(if is_active { cx.theme().status().info_background } else { cx.theme().colors().element_background })
                                            .rounded_full()
                                            .child(Icon::new(icon).size(IconSize::Medium).color(if is_active { Color::Info } else { Color::Muted }))
                                    )
                                    .child(
                                        v_flex()
                                            .flex_1()
                                            .child(Label::new(name).weight(FontWeight::MEDIUM))
                                            .child(Label::new(format!("{} • Last seen: {}", status, last_seen)).color(if is_active { Color::Info } else { Color::Muted }).size(LabelSize::Small))
                                    )
                                    .child(
                                        IconButton::new(SharedString::from(format!("device-options-{i}")), IconName::Ellipsis)
                                            .style(ButtonStyle::Subtle)
                                            .icon_size(IconSize::Medium)
                                            .tooltip(Tooltip::text("Device Options"))
                                    )
                            })
                        )
                )
        )
        .into_any_element()
}

fn channel_state(snapshot: &DxAgentBridgeSnapshot, cx: &App) -> AnyElement {
    v_flex()
        .gap_1()
        .child(screen_detail_row(
            "dx-connections-channels-supported".into(),
            dx_icon(DxUiIcon::Channels),
            "Supported",
            snapshot.connected_accounts_summary.supported.to_string(),
        ))
        .child(screen_detail_row(
            "dx-connections-channels-configured".into(),
            dx_icon(DxUiIcon::Credentials),
            "Configured",
            snapshot.connected_accounts_summary.configured.to_string(),
        ))
        .child(screen_detail_row(
            "dx-connections-channels-connected".into(),
            dx_icon(DxUiIcon::Connections),
            "Connected",
            snapshot.connected_accounts_summary.connected.to_string(),
        ))
        .child(screen_detail_row(
            "dx-connections-channels-needs-auth".into(),
            IconName::Warning,
            "Needs auth",
            snapshot.connected_accounts_summary.needs_auth.to_string(),
        ))
        .child(unavailable_row(
            "dx-connections-channels-schema",
            dx_icon(DxUiIcon::Channels),
            "Channel receipts",
            "Unavailable",
            "No DX Agents channel receipt/schema is available yet.",
            "Run social list receipts until the channel contract lands.",
        ))
        .when(snapshot.social_accounts.is_empty(), |stack| {
            stack.child(screen_empty_state(
                "dx-connections-channels-empty",
                dx_icon(DxUiIcon::Receipts),
                "Run social list receipt",
                cx,
            ))
        })
        .into_any_element()
}

fn gateway_state(snapshot: &DxAgentBridgeSnapshot) -> AnyElement {
    v_flex()
        .gap_1()
        .child(screen_detail_row(
            "dx-connections-gateway-bridge".into(),
            dx_icon(DxUiIcon::Gateway),
            "Bridge",
            snapshot.status.clone(),
        ))
        .child(screen_detail_row(
            "dx-connections-gateway-provider-catalog".into(),
            IconName::FileTextOutlined,
            "Provider catalog",
            snapshot.contract_summary.provider_catalog_source.clone(),
        ))
        .child(screen_detail_row(
            "dx-connections-gateway-receipts".into(),
            dx_icon(DxUiIcon::Receipts),
            "Catalog receipts",
            snapshot
                .contract_summary
                .provider_catalog_receipt_count
                .to_string(),
        ))
        .child(unavailable_row(
            "dx-connections-gateway-health",
            dx_icon(DxUiIcon::Gateway),
            "Provider gateway",
            "Unavailable",
            "No first-class provider gateway health receipt is available yet.",
            snapshot.contract_summary.next_action.clone(),
        ))
        .into_any_element()
}

fn credential_summary(snapshot: &DxAgentBridgeSnapshot) -> String {
    let errors = snapshot
        .providers
        .iter()
        .filter(|provider| provider.credential_error.is_some())
        .count()
        + snapshot
            .social_accounts
            .iter()
            .filter(|account| account.credential_error.is_some())
            .count();
    let expirations = snapshot
        .providers
        .iter()
        .filter(|provider| provider.credential_expires_at.is_some())
        .count()
        + snapshot
            .social_accounts
            .iter()
            .filter(|account| account.credential_expires_at.is_some())
            .count();

    format!("{errors} issues / {expirations} expiry rows")
}

fn credential_state(snapshot: &DxAgentBridgeSnapshot) -> AnyElement {
    let provider_error_count = snapshot
        .providers
        .iter()
        .filter(|provider| provider.credential_error.is_some())
        .count();
    let social_error_count = snapshot
        .social_accounts
        .iter()
        .filter(|account| account.credential_error.is_some())
        .count();
    let expiry_count = snapshot
        .providers
        .iter()
        .filter(|provider| provider.credential_expires_at.is_some())
        .count()
        + snapshot
            .social_accounts
            .iter()
            .filter(|account| account.credential_expires_at.is_some())
            .count();

    let status = if provider_error_count + social_error_count > 0 {
        AiSettingItemStatus::Error
    } else if snapshot.providers.is_empty() && snapshot.social_accounts.is_empty() {
        AiSettingItemStatus::Stopped
    } else {
        AiSettingItemStatus::Running
    };

    AiSettingItem::new(
        "dx-connections-credential-health",
        "Credential health",
        status,
        AiSettingItemSource::Custom,
    )
    .icon(
        Icon::new(dx_icon(DxUiIcon::Credentials))
            .size(IconSize::Small)
            .color(Color::Muted),
    )
    .detail_label(match status {
        AiSettingItemStatus::Running => "Healthy",
        AiSettingItemStatus::Error => "Needs attention",
        _ => "Receipt required",
    })
    .details(screen_detail_stack(vec![
        screen_detail_row(
            "dx-connections-credential-provider-errors".into(),
            IconName::Warning,
            "Provider errors",
            provider_error_count.to_string(),
        ),
        screen_detail_row(
            "dx-connections-credential-social-errors".into(),
            IconName::Warning,
            "Social errors",
            social_error_count.to_string(),
        ),
        screen_detail_row(
            "dx-connections-credential-expiry".into(),
            IconName::Clock,
            "Expiry rows",
            expiry_count.to_string(),
        ),
        screen_detail_row(
            "dx-connections-credential-action".into(),
            IconName::FileTextOutlined,
            "Next action",
            snapshot.receipt_index.next_action.clone(),
        ),
    ]))
    .into_any_element()
}

fn unavailable_row(
    id: &'static str,
    icon: IconName,
    label: &'static str,
    detail_label: &'static str,
    state: impl Into<SharedString>,
    next_action: impl Into<SharedString>,
) -> AnyElement {
    AiSettingItem::new(
        id,
        label,
        AiSettingItemStatus::Stopped,
        AiSettingItemSource::Custom,
    )
    .icon(Icon::new(icon).size(IconSize::Small).color(Color::Muted))
    .detail_label(detail_label)
    .details(screen_detail_stack(vec![
        screen_detail_row(
            format!("{id}-state").into(),
            IconName::Warning,
            "State",
            state,
        ),
        screen_detail_row(
            format!("{id}-action").into(),
            IconName::FileTextOutlined,
            "Next action",
            next_action,
        ),
    ]))
    .into_any_element()
}
