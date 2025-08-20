import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, FileText, Paperclip } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Attachment {
  name: string;
  url?: string;
}

interface Note {
  id: string;
  text: string;
  author: string;
  date: string;
  attachments?: Attachment[];
}

interface NotesData {
  [productId: string]: Note[];
}

interface NotesTabProps {
  productId: string;
}

const STORAGE_KEY = "flowventory:productNotes";
const SESSION_KEY = "flowventory:session";

export function NotesTab({ productId }: NotesTabProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState({
    text: "",
    attachmentName: ""
  });
  const { toast } = useToast();

  // Get current user from session mock
  const getCurrentUser = (): string => {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      if (session) {
        const sessionData = JSON.parse(session);
        return sessionData.currentUserName || "You";
      }
    } catch (error) {
      console.error("Error reading session:", error);
    }
    return "You";
  };

  // Load notes from localStorage
  const loadNotes = () => {
    try {
      const storedNotes = localStorage.getItem(STORAGE_KEY);
      if (storedNotes) {
        const notesData: NotesData = JSON.parse(storedNotes);
        const productNotes = notesData[productId] || [];
        // Sort by date (newest first)
        productNotes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setNotes(productNotes);
      }
    } catch (error) {
      console.error("Error loading notes:", error);
      setNotes([]);
    }
  };

  // Save notes to localStorage
  const saveNotes = (updatedNotes: Note[]) => {
    try {
      const storedNotes = localStorage.getItem(STORAGE_KEY);
      const notesData: NotesData = storedNotes ? JSON.parse(storedNotes) : {};
      notesData[productId] = updatedNotes;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notesData));
      setNotes(updatedNotes);
    } catch (error) {
      console.error("Error saving notes:", error);
      toast({
        title: "Error",
        description: "Failed to save note. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Generate random ID
  const generateId = (): string => {
    return "n_" + Math.random().toString(36).substr(2, 6);
  };

  // Add new note
  const handleAddNote = () => {
    if (!formData.text.trim()) {
      toast({
        title: "Error",
        description: "Note text is required.",
        variant: "destructive",
      });
      return;
    }

    const newNote: Note = {
      id: generateId(),
      text: formData.text.trim(),
      author: getCurrentUser(),
      date: new Date().toISOString(),
      attachments: formData.attachmentName.trim() 
        ? [{ name: formData.attachmentName.trim() }] 
        : undefined
    };

    const updatedNotes = [newNote, ...notes];
    saveNotes(updatedNotes);
    
    // Reset form and close modal
    setFormData({ text: "", attachmentName: "" });
    setIsAddModalOpen(false);
    
    toast({
      title: "Success",
      description: "Note added successfully.",
    });
  };

  // Edit note
  const handleEditNote = () => {
    if (!editingNote || !formData.text.trim()) {
      toast({
        title: "Error",
        description: "Note text is required.",
        variant: "destructive",
      });
      return;
    }

    const updatedNote: Note = {
      ...editingNote,
      text: formData.text.trim(),
      attachments: formData.attachmentName.trim() 
        ? [{ name: formData.attachmentName.trim() }] 
        : undefined
    };

    const updatedNotes = notes.map(note => 
      note.id === editingNote.id ? updatedNote : note
    );
    saveNotes(updatedNotes);
    
    // Reset form and close modal
    setFormData({ text: "", attachmentName: "" });
    setEditingNote(null);
    setIsEditModalOpen(false);
    
    toast({
      title: "Success",
      description: "Note updated successfully.",
    });
  };

  // Delete note
  const handleDeleteNote = (noteId: string) => {
    if (confirm("Are you sure you want to delete this note?")) {
      const updatedNotes = notes.filter(note => note.id !== noteId);
      saveNotes(updatedNotes);
      
      toast({
        title: "Success",
        description: "Note deleted successfully.",
      });
    }
  };

  // Open edit modal
  const openEditModal = (note: Note) => {
    setEditingNote(note);
    setFormData({
      text: note.text,
      attachmentName: note.attachments?.[0]?.name || ""
    });
    setIsEditModalOpen(true);
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return dateString;
    }
  };

  useEffect(() => {
    loadNotes();
  }, [productId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-green-400" />
          <h2 className="text-xl font-semibold text-white">Product Notes</h2>
          <Badge variant="outline" className="text-zinc-400 border-zinc-600">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </Badge>
        </div>
        
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
            <DialogHeader>
              <DialogTitle>Add New Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="noteText" className="text-zinc-400">
                  Note Text *
                </Label>
                <Textarea
                  id="noteText"
                  placeholder="Enter your note here..."
                  value={formData.text}
                  onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                  className="bg-zinc-900 border-zinc-700 text-white min-h-[120px]"
                />
              </div>
              <div>
                <Label htmlFor="attachmentName" className="text-zinc-400">
                  Attachment Name (Optional)
                </Label>
                <Input
                  id="attachmentName"
                  placeholder="e.g., product-spec.pdf, image.jpg"
                  value={formData.attachmentName}
                  onChange={(e) => setFormData(prev => ({ ...prev, attachmentName: e.target.value }))}
                  className="bg-zinc-900 border-zinc-700 text-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFormData({ text: "", attachmentName: "" });
                    setIsAddModalOpen(false);
                  }}
                  className="border-zinc-600 text-zinc-400 hover:bg-zinc-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddNote}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Add Note
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Notes List */}
      {notes.length === 0 ? (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardContent className="py-16 text-center">
            <FileText className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No notes yet</h3>
            <p className="text-zinc-400 mb-6">
              Add the first note to guide your team.
            </p>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Note
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <Card
              key={note.id}
              className="bg-zinc-950 border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Note Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                        <span className="text-green-400 font-medium text-sm">
                          {note.author.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{note.author}</p>
                        <p className="text-zinc-400 text-sm">{formatDate(note.date)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(note)}
                        className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Note Content */}
                  <div className="pl-11">
                    <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {note.text}
                    </p>
                    
                    {/* Attachments */}
                    {note.attachments && note.attachments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {note.attachments.map((attachment, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="bg-zinc-800 border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                          >
                            <Paperclip className="w-3 h-3 mr-1" />
                            {attachment.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editNoteText" className="text-zinc-400">
                Note Text *
              </Label>
              <Textarea
                id="editNoteText"
                placeholder="Enter your note here..."
                value={formData.text}
                onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                className="bg-zinc-900 border-zinc-700 text-white min-h-[120px]"
              />
            </div>
            <div>
              <Label htmlFor="editAttachmentName" className="text-zinc-400">
                Attachment Name (Optional)
              </Label>
              <Input
                id="editAttachmentName"
                placeholder="e.g., product-spec.pdf, image.jpg"
                value={formData.attachmentName}
                onChange={(e) => setFormData(prev => ({ ...prev, attachmentName: e.target.value }))}
                className="bg-zinc-900 border-zinc-700 text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setFormData({ text: "", attachmentName: "" });
                  setEditingNote(null);
                  setIsEditModalOpen(false);
                }}
                className="border-zinc-600 text-zinc-400 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditNote}
                className="bg-green-600 hover:bg-green-700"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}