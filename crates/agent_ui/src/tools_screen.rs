use gpui::{
    App, Context, EventEmitter, FocusHandle, Focusable, Render, SharedString, Window, ScrollHandle,
};
use ui::{Icon, prelude::*, Button, ButtonStyle, Label, LabelSize, Color, Divider, TintColor, IconButton, IconName};
use workspace::{
    Item, Workspace,
    item::{ItemEvent, WorkspaceScreenKind},
};
use zed_actions::assistant::OpenTools;
use crate::workflow_node_icons::workflow_node_icon_asset_for;
use editor::Editor;

#[derive(Clone)]
struct N8nNode {
    id: usize,
    name: SharedString,
    description: SharedString,
    category: SharedString,
}

impl N8nNode {
    fn generate_mock_data() -> Vec<Self> {
        let mut nodes = Vec::with_capacity(500);
        let categories = ["Core", "Dev", "Marketing", "Data", "AI", "Communication"];
        let base_names = ["Postgres", "Telegram", "Slack", "Gmail", "AWS S3", "OpenAI", "Stripe", "Github", "Jira", "Notion"];
        for i in 0..500 {
            let cat = categories[i % categories.len()];
            let base = base_names[i % base_names.len()];
            nodes.push(Self {
                id: i,
                name: format!("{base}").into(),
                description: format!("Automate {base} workflows via the n8n {cat} integration.").into(),
                category: cat.into(),
            });
        }
        nodes
    }
}

pub struct ToolsScreen {
    focus_handle: FocusHandle,
    scroll_handle: ScrollHandle,
    nodes: Vec<N8nNode>,
    query_editor: gpui::Entity<Editor>,
}

impl ToolsScreen {
    pub(crate) fn new(_workspace: &Workspace, window: &mut Window, cx: &mut Context<Self>) -> Self {
        let query_editor = cx.new(|cx| {
            let mut editor = Editor::single_line(window, cx);
            editor.set_placeholder_text("Search plugins...", window, cx);
            editor
        });

        cx.subscribe(&query_editor, |_, _, event: &editor::EditorEvent, cx| {
            if matches!(event, editor::EditorEvent::BufferEdited) {
                cx.notify();
            }
        }).detach();

        Self {
            focus_handle: cx.focus_handle(),
            scroll_handle: ScrollHandle::new(),
            nodes: N8nNode::generate_mock_data(),
            query_editor,
        }
    }

    pub(crate) fn open_or_focus(
        workspace: &mut Workspace,
        window: &mut Window,
        cx: &mut Context<Workspace>,
    ) {
        workspace.dismiss_zoomed_agent_panel(window, cx);

        let existing_item = workspace
            .pane_for_screen_kind(WorkspaceScreenKind::Tools, cx)
            .and_then(|pane| {
                pane.read(cx).items().find_map(|item| {
                    (item.screen_kind(cx) == WorkspaceScreenKind::Tools).then(|| item.boxed_clone())
                })
            });
        if let Some(item) = existing_item {
            workspace.activate_item(&*item, true, true, window, cx);
            return;
        }

        let target_pane = workspace.screen_host_pane();
        let item = cx.new(|cx| Self::new(workspace, window, cx));
        workspace.add_item(target_pane, Box::new(item), None, true, true, window, cx);
    }

    pub fn open(
        workspace: &mut Workspace,
        _: &OpenTools,
        window: &mut Window,
        cx: &mut Context<Workspace>,
    ) {
        Self::open_or_focus(workspace, window, cx);
    }
}

impl EventEmitter<ItemEvent> for ToolsScreen {}

impl Focusable for ToolsScreen {
    fn focus_handle(&self, _cx: &App) -> FocusHandle {
        self.focus_handle.clone()
    }
}

impl Item for ToolsScreen {
    type Event = ItemEvent;

    fn tab_content_text(&self, _detail: usize, _cx: &App) -> SharedString {
        "Plugins".into()
    }

    fn tab_icon(&self, _window: &Window, _cx: &App) -> Option<Icon> {
        Some(Icon::new(dx_icon(DxUiIcon::Plugins)))
    }

    fn telemetry_event_text(&self) -> Option<&'static str> {
        Some("Plugins Screen Opened")
    }

    fn screen_kind(&self) -> WorkspaceScreenKind {
        WorkspaceScreenKind::Tools
    }

    fn show_toolbar(&self) -> bool {
        false
    }

    fn can_split(&self) -> bool {
        false
    }
}

impl Render for ToolsScreen {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let nodes = self.nodes.clone();
        let entity = cx.entity().downgrade();

        let mut query = self.query_editor.read(cx).text(cx);
        query.make_ascii_lowercase();

        let visible_nodes = if query.is_empty() {
            nodes.into_iter().take(48).collect::<Vec<_>>()
        } else {
            nodes.into_iter().filter(|node| {
                node.name.to_lowercase().contains(&query) || node.description.to_lowercase().contains(&query)
            }).take(48).collect::<Vec<_>>()
        };

        // Each card takes a fixed share of the row and shrinks so that multiple
        // cards fit per row when there is horizontal space (mirrors the
        // extensions grid behavior), wrapping to the next line otherwise.
        let card_min = rems_from_px(280.);

        v_flex()
            .size_full()
            .bg(cx.theme().colors().editor_background)
            .child(
                v_flex()
                    .px_4()
                    .pt_4()
                    .pb_3()
                    .child(
                        h_flex()
                            .w_full()
                            .justify_between()
                            .items_center()
                            .child(
                                v_flex()
                                    .child(Label::new("Plugins").size(LabelSize::Large).color(Color::Default))
                                    .child(Label::new("Browse and install 500+ n8n workflow nodes.").size(LabelSize::Small).color(Color::Muted))
                            )
                            .child(
                                h_flex()
                                    .w(rems_from_px(240.))
                                    .child(self.query_editor.clone())
                            )
                            .child(
                                Button::new("refresh-plugins", "Refresh Catalog")
                                    .style(ButtonStyle::Subtle)
                            )
                    ),
            )
            .child(Divider::horizontal())
            .child(
                div()
                    .id("n8n-nodes-grid-scroll")
                    .flex_1()
                    .min_h_0()
                    .w_full()
                    .overflow_y_scroll()
                    .track_scroll(&self.scroll_handle)
                    .child(
                        h_flex()
                            .w_full()
                            .flex_wrap()
                            .gap_3()
                            .p_4()
                            .children(visible_nodes.iter().map(|node| {
                                v_flex()
                                    .id(("node-card", node.id))
                                    .flex_1()
                                    .min_w(card_min)
                                    .max_w(rems_from_px(480.))
                                    .p_3()
                                    .rounded_md()
                                    .bg(cx.theme().colors().elevated_surface_background)
                                    .border_1()
                                    .border_color(cx.theme().colors().border_variant)
                                    .hover(|s| s.bg(cx.theme().colors().element_hover))
                                    .child(
                                        h_flex()
                                            .w_full()
                                            .justify_between()
                                            .items_center()
                                            .gap_2()
                                            .child(
                                                h_flex()
                                                    .gap_2()
                                                    .child(workflow_node_icon_asset_for(None, Some(node.category.as_ref()), node.name.as_ref()).render(IconSize::Medium, Color::Default))
                                                    .child(
                                                        v_flex()
                                                            .child(Label::new(node.name.clone()).size(LabelSize::Default).color(Color::Default))
                                                            .child(Label::new(node.description.clone()).size(LabelSize::Small).color(Color::Muted))
                                                    )
                                            )
                                            .child(
                                                IconButton::new(("install", node.id), IconName::Download)
                                                    .style(ButtonStyle::Tinted(TintColor::Accent))
                                                    .on_click({
                                                        let entity = entity.clone();
                                                        move |_, _window, cx| {
                                                            let _ = entity.update(cx, |_, cx| cx.notify());
                                                        }
                                                    })
                                            ),
                                    )
                                    .into_any_element()
                            }))
                    )
            )
    }
}
