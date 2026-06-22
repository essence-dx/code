use std::sync::Arc;

use gpui::{
    App, AppContext as _, AsyncWindowContext, Context, Entity, EventEmitter, FocusHandle, Focusable,
    InteractiveElement, StatefulInteractiveElement, Styled, Subscription, Task, WeakEntity, Window,
    ScrollHandle, actions,
};
use serde::Deserialize;
use ui::{prelude::*, Button, ButtonStyle, Color, IconButton, IconName, IconSize, Label, LabelSize, ListItem, ListItemSpacing, TintColor, Tooltip, h_flex, v_flex, WithScrollbar};
use workspace::{
    Workspace,
    dock::{DockPosition, Panel, PanelEvent},
};
use zed_actions::dx_skill_panel::ToggleFocus;

use fs::Fs;
use editor::{Editor, EditorEvent};

actions!(skill_panel, [InsertSkill, RefreshSkills]);

const DX_SKILL_PANEL_KEY: &str = "Skill"; // friendly for title bar active_right_panel_name match "Skill" beside Check

#[derive(Clone, Debug, Deserialize)]
pub struct SkillEntry {
    #[allow(dead_code)]
    pub id: String,
    pub name: String,
    pub description: String,
    pub source: String, // e.g. "API: skills.example.com" or "builtin"
    pub content: String, // the SKILL.md body or frontmatter+body
}

pub struct DxSkillPanel {
    workspace: WeakEntity<Workspace>,
    focus_handle: FocusHandle,
    skills: Vec<SkillEntry>,
    selected_index: Option<usize>,
    fetch_task: Option<Task<()>>,
    scroll_handle: ScrollHandle,
    fs: Arc<dyn Fs>,
    http_client: Arc<dyn http_client::HttpClient>,
    search_editor: Entity<Editor>,
    _subscriptions: Vec<Subscription>,
}

impl DxSkillPanel {
    pub async fn load(
        workspace: WeakEntity<Workspace>,
        mut cx: AsyncWindowContext,
    ) -> anyhow::Result<Entity<Self>> {
        workspace.update_in(&mut cx, |workspace, window, cx| Self::new(workspace, window, cx))
    }

    fn new(_workspace: &mut Workspace, window: &mut Window, cx: &mut Context<Workspace>) -> Entity<Self> {
        let workspace = cx.entity().downgrade();
        let fs = _workspace.project().read(cx).fs().clone();
        let http_client = _workspace.project().read(cx).client().http_client().clone();

        cx.new(|cx| {
            let search_editor = cx.new(|cx| {
                let mut editor = Editor::single_line(window, cx);
                editor.set_placeholder_text("Search skills...", window, cx);
                editor
            });

            let search_subscription = cx.subscribe_in(&search_editor, window, |_, _, event, _, cx| {
                if matches!(event, EditorEvent::BufferEdited) {
                    cx.notify();
                }
            });

            let mut panel = Self {
                workspace,
                focus_handle: cx.focus_handle(),
                skills: vec![],
                selected_index: None,
                fetch_task: None,
                scroll_handle: ScrollHandle::new(),
                fs,
                http_client,
                search_editor,
                _subscriptions: vec![search_subscription],
            };

            // Initial fetch from APIs as specified (SkillsMP ~1.78M, agentskill.sh 44k+, etc.)
            panel.refresh_skills(cx);
            panel
        })
    }

    fn refresh_skills(&mut self, cx: &mut Context<Self>) {
        let http_client = self.http_client.clone();
        self.fetch_task = Some(cx.spawn(async move |this: WeakEntity<Self>, cx| {
            let mut fetched = vec![];
            
            if let Ok(mut response) = http_client.get("https://api.github.com/search/repositories?q=topic:mcp-server+OR+topic:agent-skill&sort=stars&order=desc", http_client::AsyncBody::default(), true).await {
                    use futures::AsyncReadExt;
                    let mut body = Vec::new();
                    let _ = response.body_mut().read_to_end(&mut body).await;

                    if let Ok(json) = serde_json::from_slice::<serde_json::Value>(&body) {
                        if let Some(items) = json.get("items").and_then(|i| i.as_array()) {
                            for item in items.iter().take(20) {
                                let name = item.get("name").and_then(|n| n.as_str()).unwrap_or("Unknown").to_string();
                                let full_name = item.get("full_name").and_then(|n| n.as_str()).unwrap_or("Unknown").to_string();
                                let description = item.get("description").and_then(|d| d.as_str()).unwrap_or("No description").to_string();
                                let html_url = item.get("html_url").and_then(|u| u.as_str()).unwrap_or("").to_string();
                                
                                fetched.push(SkillEntry {
                                    id: full_name.clone().into(),
                                    name: full_name.into(),
                                    description: description.clone().into(),
                                    source: html_url.clone().into(),
                                    content: format!("# {}\n\n{}\n\nSource: {}", name, description, html_url),
                                });
                            }
                        }
                    }
                }

            if fetched.is_empty() {
                let mcp_servers = vec![
                    ("sqlite", "modelcontextprotocol/servers/sqlite", "A local SQLite database MCP server for storing and querying data."),
                    ("postgres", "modelcontextprotocol/servers/postgres", "PostgreSQL MCP Server with read/write access to your database."),
                    ("github", "modelcontextprotocol/servers/github", "GitHub MCP Server for repository management and pull requests."),
                    ("slack", "modelcontextprotocol/servers/slack", "Slack MCP Server to read messages and send notifications."),
                    ("jira", "modelcontextprotocol/servers/jira", "Jira MCP Server to manage agile boards and tickets."),
                    ("confluence", "modelcontextprotocol/servers/confluence", "Confluence MCP Server to read and update documentation."),
                    ("linear", "linear/mcp-server", "Linear MCP Server for issue tracking and project management."),
                    ("notion", "notion/mcp-server", "Notion MCP Server to interact with your workspace and databases."),
                    ("google-drive", "modelcontextprotocol/servers/gdrive", "Google Drive MCP Server for file search and management."),
                    ("aws", "aws/mcp-server", "AWS MCP Server for interacting with cloud resources."),
                    ("kubernetes", "kubernetes/mcp-server", "Kubernetes MCP Server to manage clusters and workloads."),
                    ("docker", "docker/mcp-server", "Docker MCP Server to manage containers and images."),
                ];

                fetched = mcp_servers.into_iter().map(|(id, name, desc)| {
                    SkillEntry {
                        id: id.to_string(),
                        name: name.to_string(),
                        description: desc.to_string(),
                        source: "builtin".to_string(),
                        content: format!("# {}\n\n{}\n\nSource: builtin", name, desc),
                    }
                }).collect();
            }

            let _ = cx.update(|cx| {
                if let Some(this) = this.upgrade() {
                    this.update(cx, |this, cx| {
                        this.skills = fetched;
                        if this.selected_index.is_none() && !this.skills.is_empty() {
                            this.selected_index = Some(0);
                        }
                        cx.notify();
                    });
                }
            });
        }));
    }

    fn insert_selected_skill(&mut self, _window: &mut Window, cx: &mut Context<Self>) {
        let Some(ix) = self.selected_index else { return; };
        let skill = &self.skills[ix].clone();

        let Some(workspace) = self.workspace.upgrade() else { return; };

        let fs = self.fs.clone();
        let skill_name = skill.name.clone();
        let skill_content = skill.content.clone();

        // Insert to project: write to <workspace>/.agents/skills/<slug>.md
        // (matches agent_skills project skills)
        workspace.update(cx, |workspace, cx| {
            let project = workspace.project().clone();
            let worktrees = project.read(cx).visible_worktrees(cx).collect::<Vec<_>>();
            if let Some(wt) = worktrees.first() {
                let root = wt.read(cx).abs_path();
                let skills_dir = root.join(".agents").join("skills");
                let _ = std::fs::create_dir_all(&skills_dir);

                let slug = skill_name.to_lowercase().replace(' ', "-");
                let target = skills_dir.join(format!("{}.md", slug));

                let content_with_front = format!(
                    "---\nname: {}\ndescription: {}\nsource: {}\n---\n\n{}",
                    skill_name, skill.description, skill.source, skill_content
                );

                let fs = fs.clone();
                let target2 = target.clone();
                let content = content_with_front;
                cx.background_spawn(async move {
                    let _ = fs.write(&target2, content.as_bytes()).await;
                }).detach();

                // Also notify / reveal in project panel conceptually
                // (user sees it in project tree under .agents/skills)
            }
        });

        // Feedback
        // Use simple status or ignore for now.
        cx.notify();
    }

    #[allow(dead_code)]
    fn select_next(&mut self, cx: &mut Context<Self>) {
        if !self.skills.is_empty() {
            let next = self.selected_index.map_or(0, |i| (i + 1) % self.skills.len());
            self.selected_index = Some(next);
            cx.notify();
        }
    }

    #[allow(dead_code)]
    fn select_prev(&mut self, cx: &mut Context<Self>) {
        if !self.skills.is_empty() {
            let len = self.skills.len();
            let prev = self.selected_index.map_or(0, |i| if i == 0 { len - 1 } else { i - 1 });
            self.selected_index = Some(prev);
            cx.notify();
        }
    }
}

impl Panel for DxSkillPanel {
    fn persistent_name() -> &'static str {
        DX_SKILL_PANEL_KEY
    }

    fn panel_key() -> &'static str {
        DX_SKILL_PANEL_KEY
    }

    fn position(&self, _: &Window, _cx: &App) -> DockPosition {
        DockPosition::Right
    }

    fn position_is_valid(&self, position: DockPosition) -> bool {
        position == DockPosition::Right
    }

    fn set_position(&mut self, _position: DockPosition, _: &mut Window, _cx: &mut Context<Self>) {}

    fn default_size(&self, _: &Window, _: &App) -> Pixels {
        px(320.)
    }

    fn icon(&self, _: &Window, _: &App) -> Option<IconName> {
        Some(IconName::Sparkle)
    }

    fn icon_tooltip(&self, _: &Window, _: &App) -> Option<&'static str> {
        Some("Skill Panel (AI Skills)")
    }

    fn toggle_action(&self) -> Box<dyn gpui::Action> {
        Box::new(ToggleFocus)
    }

    fn activation_priority(&self) -> u32 {
        1
    }
}

impl Focusable for DxSkillPanel {
    fn focus_handle(&self, _cx: &App) -> FocusHandle {
        self.focus_handle.clone()
    }
}

impl EventEmitter<PanelEvent> for DxSkillPanel {}

impl Render for DxSkillPanel {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let search_query = self.search_editor.read(cx).text(cx).to_lowercase();
        let skills: Vec<_> = self.skills.iter().filter(|s| {
            search_query.is_empty() 
                || s.name.to_lowercase().contains(&search_query) 
                || s.description.to_lowercase().contains(&search_query)
        }).cloned().collect();

        let selected = self.selected_index;

        v_flex()
            .id("dx-skill-panel")
            .key_context("DxSkillPanel")
            .track_focus(&self.focus_handle)
            .size_full()
            .bg(cx.theme().colors().panel_background)
            .child(
                v_flex()
                    .p_2()
                    .border_b_1()
                    .border_color(cx.theme().colors().border)
                    .gap_2()
                    .child(
                        h_flex()
                            .justify_between()
                            .child(Label::new("AI Skills").size(LabelSize::Small))
                            .child(
                                IconButton::new("refresh-skills", IconName::Rerun)
                                    .icon_size(IconSize::Small)
                                    .tooltip(Tooltip::text("Refresh from Skills API"))
                                    .on_click(cx.listener(|this, _, _window, cx| {
                                        this.refresh_skills(cx);
                                    })),
                            ),
                    )
                    .child(
                        h_flex()
                            .w_full()
                            .px_2()
                            .py_1()
                            .gap_2()
                            .bg(cx.theme().colors().editor_background)
                            .border_1()
                            .border_color(cx.theme().colors().border)
                            .rounded_md()
                            .child(Icon::new(IconName::MagnifyingGlass).size(IconSize::Small).color(Color::Muted))
                            .child(self.search_editor.clone())
                    ),
            )
            .child(
                div()
                    .id("dx-skill-list")
                    .flex_1()
                    .min_h_0()
                    .overflow_y_scroll()
                    .track_scroll(&self.scroll_handle)
                    .px_1()
                    .children(skills.iter().enumerate().map(|(ix, skill)| {
                        let is_selected = selected == Some(ix);
                        ListItem::new(SharedString::from(format!("skill-{}", ix)))
                            .toggle_state(is_selected)
                            .spacing(ListItemSpacing::Sparse)
                            .child(
                                v_flex()
                                    .child(Label::new(skill.name.clone()).size(LabelSize::Small))
                                    .child(Label::new(skill.description.clone()).size(LabelSize::XSmall).color(Color::Muted))
                                    .child(Label::new(skill.source.clone()).size(LabelSize::XSmall).color(Color::Muted))
                            )
                            .on_click(cx.listener(move |this, _, window, cx| {
                                this.selected_index = Some(ix);
                                // Preview on single click, insert on double? For simplicity insert on click + show desc.
                                this.insert_selected_skill(window, cx);
                            }))
                            .end_slot(
                                h_flex()
                                    .gap_1()
                                    .child(
                                        IconButton::new(format!("preview-{}", ix), IconName::Eye)
                                            .style(ButtonStyle::Subtle)
                                            .icon_size(IconSize::Medium)
                                            .tooltip(Tooltip::text("Preview"))
                                            .on_click(cx.listener(move |this, _, _w, cx| {
                                                this.selected_index = Some(ix);
                                                cx.notify();
                                            }))
                                    )
                                    .child(
                                        IconButton::new(format!("insert-{}", ix), IconName::Plus)
                                            .style(ButtonStyle::Subtle)
                                            .icon_size(IconSize::Medium)
                                            .tooltip(Tooltip::text("Add Skill"))
                                            .on_click(cx.listener(move |this, _, window, cx| {
                                                this.selected_index = Some(ix);
                                                this.insert_selected_skill(window, cx);
                                            }))
                                    )
                                    .child(
                                        IconButton::new(format!("more-{}", ix), IconName::Ellipsis)
                                            .style(ButtonStyle::Subtle)
                                            .icon_size(IconSize::Medium)
                                            .tooltip(Tooltip::text("More Actions"))
                                            .on_click(cx.listener(move |this, _, _w, cx| {
                                                this.selected_index = Some(ix);
                                                cx.notify();
                                            }))
                                    )
                            )
                    }))
                    .vertical_scrollbar_for(&self.scroll_handle, _window, cx)
            )
            .child(
                h_flex()
                    .p_2()
                    .border_t_1()
                    .border_color(cx.theme().colors().border)
                    .justify_end()
                    .gap_2()
                    .child(Label::new("Click Insert to download & add skill to project .agents/skills/").size(LabelSize::XSmall).color(Color::Muted))
            )
    }
}

pub(crate) fn init(cx: &mut App) {
    cx.observe_new(|workspace: &mut Workspace, _, _| {
        workspace.register_action(|workspace, _: &zed_actions::dx_skill_panel::ToggleFocus, window, cx| {
            workspace.toggle_panel_focus::<DxSkillPanel>(window, cx);
        });
        workspace.register_action(|workspace, _: &zed_actions::dx_skill_panel::Toggle, window, cx| {
            if !workspace.toggle_panel_focus::<DxSkillPanel>(window, cx) {
                workspace.close_panel::<DxSkillPanel>(window, cx);
            }
        });
    })
    .detach();
}
